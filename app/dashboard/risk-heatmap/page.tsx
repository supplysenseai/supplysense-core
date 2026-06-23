"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, RefreshCw, Upload, Search, ShieldCheck } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { KPIInfoTrigger } from "@/components/dashboard/KPIInfoModal";
import { formatCurrency } from "@/lib/utils";
import type { DashboardMetrics, AnalyzedSKU, RiskScenario } from "@/lib/types";

const SCENARIO_CONFIG: Record<RiskScenario, { label: string; bg: string; text: string; border: string; dot: string; order: number }> = {
  CRITICAL:  { label: "Critical",  bg: "bg-red-500/15",     text: "text-red-300",    border: "border-red-500/25",    dot: "bg-red-500",    order: 0 },
  DEAD:      { label: "Dead Stock",bg: "bg-purple-500/15",  text: "text-purple-300", border: "border-purple-500/25", dot: "bg-purple-400", order: 1 },
  SLOW:      { label: "Slow Mover",bg: "bg-amber-500/15",   text: "text-amber-300",  border: "border-amber-500/25",  dot: "bg-amber-400",  order: 2 },
  OVERSTOCK: { label: "Overstock", bg: "bg-orange-500/15",  text: "text-orange-300", border: "border-orange-500/25", dot: "bg-orange-400", order: 3 },
  WATCH:     { label: "Watch",     bg: "bg-blue-500/15",    text: "text-blue-300",   border: "border-blue-500/25",   dot: "bg-blue-400",   order: 4 },
  HEALTHY:   { label: "Healthy",   bg: "bg-emerald-500/15", text: "text-emerald-300",border: "border-emerald-500/25",dot: "bg-emerald-400",order: 5 },
};

type FilterType = "ALL" | RiskScenario;

export default function RiskHeatmapPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [noData, setNoData] = useState(false);
  const [filter, setFilter] = useState<FilterType>("ALL");
  const [search, setSearch] = useState("");

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

  const rd = metrics.risk_distribution;
  const allItems: AnalyzedSKU[] = metrics.top_risk_items;

  // Build full item list from all available data
  const allUnique = Array.from(
    new Map(allItems.map((i) => [i.sku_id, i])).values()
  ).sort((a, b) => SCENARIO_CONFIG[a.scenario].order - SCENARIO_CONFIG[b.scenario].order);

  const filtered = allUnique
    .filter((i) => filter === "ALL" || i.scenario === filter)
    .filter((i) =>
      search === "" ||
      i.sku_id.toLowerCase().includes(search.toLowerCase()) ||
      i.product_name.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase())
    );

  const summaryBuckets: { scenario: RiskScenario; count: number }[] = [
    { scenario: "CRITICAL",  count: rd.critical },
    { scenario: "DEAD",      count: rd.dead },
    { scenario: "SLOW",      count: rd.elevated },
    { scenario: "WATCH",     count: rd.watch },
    { scenario: "HEALTHY",   count: rd.low },
  ];
  const total = Object.values(rd).reduce((s, v) => s + v, 0) || 1;

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
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Risk Heatmap
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1100px] mx-auto px-4 py-6 space-y-5">

            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: "Syne, sans-serif" }}>
                Risk Heatmap
                <KPIInfoTrigger kpiKey="stockout_risk" metrics={metrics} />
              </h1>
              <p className="text-xs text-slate-500 mt-1">Every SKU classified by risk scenario. Filter and search to find problem items instantly.</p>
            </div>

            {/* Transparency statement */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <p className="text-[11px] text-slate-500">
                <span className="text-emerald-400 font-medium">Transparent classification.</span>
                {" "}All risk scores and scenario assignments are based on your uploaded data and can be independently verified.
              </p>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {summaryBuckets.map(({ scenario, count }) => {
                const cfg = SCENARIO_CONFIG[scenario];
                const pct = Math.round((count / total) * 100);
                return (
                  <button
                    key={scenario}
                    onClick={() => setFilter(filter === scenario ? "ALL" : scenario)}
                    className={`card-elevated p-3 text-left transition-all duration-200 cursor-pointer ${filter === scenario ? `ring-1 ${cfg.border}` : "hover:border-white/12"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">{cfg.label}</span>
                    </div>
                    <div className={`text-xl font-bold ${cfg.text}`}>{count}</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">{pct}% of SKUs</div>
                  </button>
                );
              })}
            </div>

            {/* Stacked bar */}
            <div className="card p-4">
              <p className="text-[10px] text-slate-600 mb-2 uppercase tracking-wider">Portfolio risk distribution</p>
              <div className="flex h-3 rounded-full overflow-hidden gap-px">
                {summaryBuckets.filter((b) => b.count > 0).map(({ scenario, count }) => {
                  const pct = (count / total) * 100;
                  const cfg = SCENARIO_CONFIG[scenario];
                  return (
                    <div key={scenario}
                      className="h-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: scenario === "CRITICAL" ? "#ef4444" : scenario === "DEAD" ? "#a78bfa" : scenario === "SLOW" ? "#f59e0b" : scenario === "WATCH" ? "#3b82f6" : "#10b981"
                      }}
                    />
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {summaryBuckets.filter((b) => b.count > 0).map(({ scenario, count }) => {
                  const cfg = SCENARIO_CONFIG[scenario];
                  return (
                    <div key={scenario} className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className="text-[10px] text-slate-500">{cfg.label} ({count})</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Search + filter row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search SKU, product name, or category…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white/4 border border-white/10 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#6366f1]/50"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["ALL", "CRITICAL", "DEAD", "SLOW", "WATCH", "HEALTHY"] as FilterType[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                      filter === f
                        ? "bg-[#6366f1] text-white"
                        : "bg-white/5 text-slate-400 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    {f === "ALL" ? "All" : SCENARIO_CONFIG[f as RiskScenario].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Items table */}
            <div className="card overflow-hidden">
              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                <span className="text-xs font-semibold text-white">
                  {filtered.length} item{filtered.length !== 1 ? "s" : ""}
                  {filter !== "ALL" && <span className="text-slate-500"> · filtered</span>}
                </span>
                <span className="text-[11px] text-slate-600">Click scenario pills to filter</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      {["SKU", "Product", "Category", "Scenario", "ABC", "Stock Qty", "Days Left", "Risk Score", "Value"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] text-slate-600 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/4">
                    {filtered.slice(0, 100).map((item) => {
                      const cfg = SCENARIO_CONFIG[item.scenario];
                      return (
                        <tr key={item.sku_id} className="hover:bg-white/2 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">{item.sku_id}</td>
                          <td className="px-4 py-2.5 text-white font-medium max-w-[200px] truncate">{item.product_name}</td>
                          <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{item.category || "—"}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`text-[11px] font-bold ${item.abc_class === "A" ? "text-emerald-400" : item.abc_class === "B" ? "text-blue-400" : "text-slate-500"}`}>
                              {item.abc_class}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-white tabular-nums">{item.units_on_hand}</td>
                          <td className="px-4 py-2.5 tabular-nums whitespace-nowrap">
                            {isFinite(item.days_stock_remaining)
                              ? <span className={item.days_stock_remaining <= 7 ? "text-red-400 font-semibold" : item.days_stock_remaining <= 30 ? "text-amber-400" : "text-slate-400"}>{Math.round(item.days_stock_remaining)}d</span>
                              : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-white/6 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${item.stockout_risk_score}%`, background: item.stockout_risk_score >= 75 ? "#ef4444" : item.stockout_risk_score >= 50 ? "#f59e0b" : "#3b82f6" }} />
                              </div>
                              <span className="text-[11px] text-slate-400 tabular-nums w-6">{item.stockout_risk_score}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-white tabular-nums whitespace-nowrap">{formatCurrency(item.inventory_value, true)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="px-5 py-10 text-center text-xs text-slate-500">No items match the current filter.</div>
                )}
                {filtered.length > 100 && (
                  <div className="px-5 py-3 text-center text-[11px] text-slate-600 border-t border-white/5">
                    Showing first 100 of {filtered.length} items
                  </div>
                )}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
