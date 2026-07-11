"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, RefreshCw, Upload, TrendingUp, TrendingDown, Minus, ShieldCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine, Cell } from "recharts";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { KPIInfoTrigger } from "@/components/dashboard/KPIInfoModal";
import { formatCurrency } from "@/lib/utils";
import type { DashboardMetrics } from "@/lib/types";
import { openDrilldown } from "@/lib/drilldown";

// Industry benchmarks
const BENCHMARKS = [
  { industry: "US Manufacturing",    value: 4.5,  color: "#6366f1" },
  { industry: "Wholesale / Distrib.", value: 6.2,  color: "#3b82f6" },
  { industry: "Retail",              value: 8.0,  color: "#10b981" },
  { industry: "Automotive Parts",    value: 3.8,  color: "#f59e0b" },
  { industry: "Electronics",         value: 5.5,  color: "#0ea5e9" },
];

export default function TurnoverPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [noData, setNoData] = useState(false);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem("supplysense_metrics");
      if (s) setMetrics(JSON.parse(s));
      else setNoData(true);
    } catch { setNoData(true); }
  }, []);

  if (noData) return (
    <div className="flex h-screen items-center justify-center bg-[#020617] ss-page">
      <div className="card p-8 max-w-sm w-full text-center space-y-4">
        <Upload className="w-8 h-8 text-[#818cf8] mx-auto" />
        <p className="text-sm text-white font-semibold">No data loaded</p>
        <Link href="/upload" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#6366f1] text-white text-sm w-full">Upload inventory</Link>
      </div>
    </div>
  );

  if (!metrics) return (
    <div className="flex h-screen items-center justify-center bg-[#020617] ss-page">
      <RefreshCw className="w-5 h-5 text-[#818cf8] animate-spin" />
    </div>
  );

  const tr = metrics.turnover_ratio;
  const mfgBenchmark = 4.5;
  const vsManufacturing = tr - mfgBenchmark;
  const turnoverColor = tr >= 6 ? "#10b981" : tr >= 4 ? "#3b82f6" : tr >= 2 ? "#f59e0b" : "#ef4444";

  // Benchmark chart data — your value + benchmarks
  const benchmarkChartData = [
    { name: "Your\nInventory", value: tr, isYours: true },
    ...BENCHMARKS.map((b) => ({ name: b.industry, value: b.value, isYours: false, color: b.color })),
  ].sort((a, b) => a.value - b.value);

  // Cost breakdown data
  const carryingCost   = metrics.annual_carrying_cost;
  const deadCarry      = metrics.dead_stock_carrying_cost;
  const slowCarry      = metrics.slow_mover_value * 0.25; // ~25% carry rate
  const activeCarry    = carryingCost - deadCarry - slowCarry;

  const costBreakdown = [
    { name: "Active stock", drillSegment: "Active stock", value: Math.max(0, activeCarry), color: "#10b981" },
    { name: "Slow movers",  drillSegment: "Slow movers",  value: Math.max(0, slowCarry),   color: "#f59e0b" },
    { name: "Dead stock",   drillSegment: "Dead stock",   value: Math.max(0, deadCarry),   color: "#ef4444" },
  ];

  // Improvement scenarios
  const daysOfInventory = tr > 0 ? Math.round(365 / tr) : 0;

  const scenarios = [
    {
      label: "Eliminate dead stock",
      action: `Liquidate ${metrics.dead_stock_count} dead stock SKUs`,
      saving: metrics.dead_stock_carrying_cost,
      newTurnover: metrics.total_inventory_value > 0
        ? ((tr * metrics.total_inventory_value) / Math.max(1, metrics.total_inventory_value - metrics.dead_stock_value))
        : tr,
      color: "#ef4444",
    },
    {
      label: "Reduce slow movers by 50%",
      action: `Optimise ${metrics.slow_mover_count} slow-moving SKUs`,
      saving: slowCarry * 0.5,
      newTurnover: metrics.total_inventory_value > 0
        ? ((tr * metrics.total_inventory_value) / Math.max(1, metrics.total_inventory_value - metrics.slow_mover_value * 0.5))
        : tr,
      color: "#f59e0b",
    },
    {
      label: "Match manufacturing benchmark",
      action: `Reduce inventory by ${formatCurrency(Math.max(0, metrics.total_inventory_value - (tr > 0 ? (metrics.total_inventory_value * tr) / mfgBenchmark : 0)), true)}`,
      saving: carryingCost * Math.max(0, (mfgBenchmark - tr) / mfgBenchmark),
      newTurnover: Math.max(tr, mfgBenchmark),
      color: "#6366f1",
    },
  ];

  return (
    <div className="flex h-screen bg-[#020617] ss-page overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        <header className="nav-glass sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center h-[46px] px-4 gap-3">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-xs text-white font-medium flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 text-blue-400" /> Turnover
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1000px] mx-auto px-4 py-6 space-y-5">

            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: "Syne, sans-serif" }}>
                Inventory Turnover
                <KPIInfoTrigger kpiKey="turnover_ratio" metrics={metrics} />
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                How many times your inventory is sold and replaced in a year. Higher = more efficient capital use.
              </p>
            </div>

            {/* Transparency statement */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <p className="text-[11px] text-slate-500">
                <span className="text-emerald-400 font-medium">Transparent calculation.</span>
                {" "}All calculations are based on your uploaded data and can be independently verified.
              </p>
            </div>

            {/* Hero metric */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: "Turnover Ratio",
                  value: `${tr}×`,
                  sub: "per year",
                  color: turnoverColor,
                  Icon: vsManufacturing > 0 ? TrendingUp : vsManufacturing < 0 ? TrendingDown : Minus,
                },
                {
                  label: "Days of Inventory",
                  value: `${daysOfInventory}d`,
                  sub: "avg days on hand",
                  color: daysOfInventory <= 60 ? "#10b981" : daysOfInventory <= 120 ? "#3b82f6" : "#f59e0b",
                  Icon: daysOfInventory <= 60 ? TrendingUp : TrendingDown,
                },
                {
                  label: "Annual Carry Cost",
                  value: formatCurrency(carryingCost, true),
                  sub: "~25% of inventory value",
                  color: "#f59e0b",
                  Icon: TrendingDown,
                },
                {
                  label: "vs Mfg Benchmark",
                  value: `${vsManufacturing >= 0 ? "+" : ""}${vsManufacturing.toFixed(1)}×`,
                  sub: `Benchmark: ${mfgBenchmark}×`,
                  color: vsManufacturing >= 0 ? "#10b981" : "#ef4444",
                  Icon: vsManufacturing >= 0 ? TrendingUp : TrendingDown,
                },
              ].map((stat) => (
                <div key={stat.label} className="card-elevated p-4 text-center space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-[11px] text-slate-600">{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* DIO benchmark summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[{ industry: "Your Inventory", dio: daysOfInventory, turnover: tr, yours: true }, ...BENCHMARKS.map(b => ({ industry: b.industry, dio: Math.round(365 / b.value), turnover: b.value, yours: false }))].map((b) => {
                const better = b.yours ? false : daysOfInventory < b.dio;
                const worse  = b.yours ? false : daysOfInventory > b.dio;
                return (
                  <div key={b.industry} className={`card p-3 text-center ${b.yours ? "border-[#6366f1]/30 bg-[#6366f1]/5" : ""}`}>
                    <p className="text-[10px] text-slate-500 truncate mb-1">{b.industry}</p>
                    <p className={`text-lg font-bold tabular-nums ${b.yours ? "text-[#818cf8]" : better ? "text-emerald-400" : worse ? "text-red-400" : "text-slate-400"}`}>
                      {b.dio}d
                    </p>
                    <p className="text-[10px] text-slate-600">{b.turnover.toFixed(1)}× turnover</p>
                    {!b.yours && (
                      <p className={`text-[10px] font-semibold mt-1 ${better ? "text-emerald-500" : worse ? "text-red-500" : "text-slate-500"}`}>
                        {better ? `↑ ${daysOfInventory - b.dio}d better` : worse ? `↓ ${daysOfInventory - b.dio > 0 ? "+" : ""}${daysOfInventory - b.dio}d slower` : "On par"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Industry benchmark bar chart */}
            <div className="card p-6">
              <p className="text-sm font-semibold text-white mb-1">Industry Benchmark Comparison</p>
              <p className="text-[11px] text-slate-500 mb-5">Your turnover vs key industry averages. Reference line = US Manufacturing (4.5×).</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={benchmarkChartData} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 4 }}>
                    <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}×`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip
                      contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                      formatter={(v) => [`${Number(v).toFixed(1)}×`, "Turnover"]}
                    />
                    <ReferenceLine x={mfgBenchmark} stroke="rgba(99,102,241,0.4)" strokeDasharray="4 3" />
                    <Bar dataKey="value" radius={[0,6,6,0]} maxBarSize={18}>
                      {benchmarkChartData.map((d) => (
                        <Cell key={d.name} fill={d.isYours ? turnoverColor : (d as { color?: string }).color ?? "#475569"} fillOpacity={d.isYours ? 1 : 0.6} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Carrying cost breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="card p-6 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-white">Annual Carrying Cost Breakdown</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Estimated at 25% of inventory value per year.</p>
                </div>
                {costBreakdown.map((c) => (
                  <div
                    key={c.name}
                    className="space-y-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => openDrilldown({ chart: "carrying_cost", segment: c.drillSegment }, metrics)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{c.name}</span>
                      <span className="text-xs font-semibold text-white tabular-nums">{formatCurrency(c.value, true)}</span>
                    </div>
                    <div className="h-2 bg-white/6 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${carryingCost > 0 ? (c.value / carryingCost) * 100 : 0}%`, background: c.color }} />
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Total Annual Cost</span>
                  <span className="text-sm font-bold text-white">{formatCurrency(carryingCost)}</span>
                </div>
              </div>

              {/* Improvement scenarios */}
              <div className="card p-6 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-white">Improvement Scenarios</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Estimated impact on turnover and annual savings.</p>
                </div>
                {scenarios.map((sc) => (
                  <div key={sc.label} className="p-3 rounded-xl bg-white/3 border border-white/6 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-white">{sc.label}</p>
                      <span className="text-[11px] font-bold text-emerald-400 tabular-nums whitespace-nowrap">
                        Save {formatCurrency(sc.saving, true)}/yr
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{sc.action}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-slate-600">New turnover:</span>
                      <span className="text-[11px] font-semibold" style={{ color: sc.color }}>
                        {sc.newTurnover.toFixed(1)}×
                      </span>
                      {sc.newTurnover > tr && (
                        <span className="text-[10px] text-emerald-500">↑ +{(sc.newTurnover - tr).toFixed(1)}×</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* What is turnover explanation */}
            <div className="card p-5">
              <p className="text-xs font-semibold text-white mb-3">How Turnover is Calculated</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-[11px] text-slate-500 leading-relaxed">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-300">Formula</p>
                  <p>Turnover = Annual COGS ÷ Average Inventory Value</p>
                  <p className="text-slate-600">COGS approximated from monthly usage × unit cost × 12</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-300">Days of Inventory</p>
                  <p>Days = 365 ÷ Turnover Ratio</p>
                  <p className="text-slate-600">Represents the average time an item sits before being consumed or sold</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-300">Carrying Cost</p>
                  <p>Estimated at 25% of total inventory value per year</p>
                  <p className="text-slate-600">Includes storage, insurance, obsolescence, and capital cost of money</p>
                </div>
              </div>
            </div>

            {/* Supporting data */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-white">Supporting Data</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Items dragging turnover below the benchmark — dead and slow-moving stock locked in your portfolio.
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Dead stock dragging turnover */}
                <div className="card overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5">
                    <p className="text-xs font-semibold text-white">Dead Stock Impact</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {metrics.dead_stock_count} SKUs · {formatCurrency(metrics.dead_stock_value, true)} locked value · eliminates {metrics.dead_stock_count > 0 ? (((metrics.total_inventory_value - metrics.dead_stock_value) > 0 ? (tr * metrics.total_inventory_value) / (metrics.total_inventory_value - metrics.dead_stock_value) - tr : 0)).toFixed(2) : "0"}× turnover drag
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    {metrics.top_dead_stock.slice(0, 8).map((item) => (
                      <div key={item.sku_id} className="flex items-center gap-3 px-5 py-2.5 border-b border-white/4 hover:bg-white/2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">{item.product_name}</p>
                          <p className="text-[10px] text-slate-500">{item.sku_id} · ABC-{item.abc_class}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-semibold text-purple-400">{formatCurrency(item.inventory_value, true)}</p>
                          <p className="text-[10px] text-slate-600">zero velocity</p>
                        </div>
                      </div>
                    ))}
                    {metrics.dead_stock_count === 0 && (
                      <div className="px-5 py-6 text-center text-xs text-slate-500">✓ No dead stock detected</div>
                    )}
                  </div>
                </div>

                {/* Slowest movers */}
                <div className="card overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/5">
                    <p className="text-xs font-semibold text-white">Slowest Moving Items</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {metrics.slow_mover_count} slow SKUs · {formatCurrency(metrics.slow_mover_value, true)} excess stock
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    {(metrics.all_skus ?? metrics.top_risk_items)
                      .filter(s => s.scenario === "SLOW")
                      .sort((a, b) => b.days_stock_remaining - a.days_stock_remaining)
                      .slice(0, 8)
                      .map((item) => (
                        <div key={item.sku_id} className="flex items-center gap-3 px-5 py-2.5 border-b border-white/4 hover:bg-white/2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white truncate">{item.product_name}</p>
                            <p className="text-[10px] text-slate-500">{item.sku_id} · ABC-{item.abc_class}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-semibold text-amber-400">
                              {isFinite(item.days_stock_remaining) ? `${Math.round(item.days_stock_remaining)}d cover` : "∞"}
                            </p>
                            <p className="text-[10px] text-slate-600">{formatCurrency(item.inventory_value, true)}</p>
                          </div>
                        </div>
                    ))}
                    {metrics.slow_mover_count === 0 && (
                      <div className="px-5 py-6 text-center text-xs text-slate-500">✓ No slow moving items detected</div>
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
