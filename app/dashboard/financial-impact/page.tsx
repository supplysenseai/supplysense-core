"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, TrendingUp, ShieldCheck, RefreshCw, Upload,
  Printer, Download, DollarSign, PiggyBank, BarChart2, Target,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { formatCurrency } from "@/lib/utils";
import type { DashboardMetrics } from "@/lib/types";

// ── Assumptions ──────────────────────────────────────────────────────────────
const CARRYING_RATE       = 0.25;
const DEAD_LIQUIDATION_RATE = 0.30;
const SLOW_REDUCTION_PCT  = 0.50;
const SLOW_RECOVERY_RATE  = 0.65;
const WACC                = 0.12;
const STORAGE_RATE        = 0.06;
const INSURANCE_RATE      = 0.02;
const OBSOLESCENCE_RATE   = 0.03;
const HANDLING_RATE       = 0.02;

const SCENARIOS = [
  { label: "Conservative", deadLiqRate: 0.20, slowRedPct: 0.25, slowRecRate: 0.55, isBase: false },
  { label: "Base Case",    deadLiqRate: 0.30, slowRedPct: 0.50, slowRecRate: 0.65, isBase: true  },
  { label: "Optimistic",  deadLiqRate: 0.45, slowRedPct: 0.75, slowRecRate: 0.75, isBase: false },
];

const CARRYING_BREAKDOWN_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#0ea5e9"];

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcMetrics(
  m: DashboardMetrics,
  deadLiqRate = DEAD_LIQUIDATION_RATE,
  slowRedPct  = SLOW_REDUCTION_PCT,
  slowRecRate = SLOW_RECOVERY_RATE,
) {
  const deadRecovery     = m.dead_stock_value * deadLiqRate;
  const slowRecovery     = m.slow_mover_value * slowRedPct * slowRecRate;
  const recoverableCapital = deadRecovery + slowRecovery;

  const reducibleInventory = m.dead_stock_value + (m.slow_mover_value * slowRedPct);
  const annualSavings      = reducibleInventory * CARRYING_RATE;

  const totalImprovement   = deadRecovery + (m.slow_mover_value * slowRedPct);
  const wcImprovementPct   = m.total_inventory_value > 0
    ? (totalImprovement / m.total_inventory_value) * 100
    : 0;

  const targetInventory  = m.total_inventory_value - m.dead_stock_value - (m.slow_mover_value * slowRedPct);
  const reductionValue   = m.total_inventory_value - targetInventory;
  const reductionPct     = m.total_inventory_value > 0
    ? (reductionValue / m.total_inventory_value) * 100
    : 0;

  return { recoverableCapital, annualSavings, wcImprovementPct, reductionValue, reductionPct };
}

function exportCSV(m: DashboardMetrics, companyName = "") {
  const dateStr = new Date().toISOString().split("T")[0];
  const orgSlug = companyName ? companyName.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-") + "-" : "";
  const rows: string[][] = [
    companyName ? [`Company: ${companyName}`, `Generated: ${dateStr}`, "", "", ""] : [],
    ["Scenario", "Recoverable Capital", "Annual Savings", "WC Improvement %", "Inventory Reduction"],
  ].filter(r => r.length > 0);
  SCENARIOS.forEach((sc) => {
    const r = calcMetrics(m, sc.deadLiqRate, sc.slowRedPct, sc.slowRecRate);
    rows.push([
      sc.label,
      r.recoverableCapital.toFixed(2),
      r.annualSavings.toFixed(2),
      r.wcImprovementPct.toFixed(2) + "%",
      r.reductionValue.toFixed(2),
    ]);
  });
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${orgSlug}financial-impact-${dateStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────
interface TooltipPayloadEntry {
  name: string;
  value: number;
  color?: string;
  fill?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function CurrencyTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#1e293b] px-3 py-2 text-xs space-y-1 shadow-xl">
      {label && <p className="text-slate-400 mb-1">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color ?? p.fill }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-semibold text-white">{formatCurrency(p.value, true)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function FinancialImpactPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [metrics, setMetrics]         = useState<DashboardMetrics | null>(null);
  const [noData, setNoData]           = useState(false);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    try {
      const prefs = localStorage.getItem("supplysense_preferences");
      if (prefs) {
        const parsed = JSON.parse(prefs);
        if (parsed.company_name) setCompanyName(parsed.company_name);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem("supplysense_metrics");
      if (s) setMetrics(JSON.parse(s));
      else setNoData(true);
    } catch { setNoData(true); }
  }, []);

  const handleExport = useCallback(() => {
    if (metrics) exportCSV(metrics, companyName);
  }, [metrics, companyName]);

  // ── No data state ────────────────────────────────────────────────────────
  if (noData) return (
    <div className="flex h-screen items-center justify-center bg-[#020617] ss-page">
      <div className="card p-8 max-w-sm w-full text-center space-y-4">
        <Upload className="w-8 h-8 text-[#818cf8] mx-auto" />
        <p className="text-sm text-white font-semibold">No data loaded</p>
        <p className="text-xs text-slate-500">Please return to the dashboard and upload inventory data first.</p>
        <Link href="/upload" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#6366f1] text-white text-sm w-full">
          Upload inventory
        </Link>
      </div>
    </div>
  );

  // ── Loading state ────────────────────────────────────────────────────────
  if (!metrics) return (
    <div className="flex h-screen items-center justify-center bg-[#020617] ss-page">
      <RefreshCw className="w-5 h-5 text-[#818cf8] animate-spin" />
    </div>
  );

  // ── Calculations ─────────────────────────────────────────────────────────
  const base = calcMetrics(metrics);
  const { recoverableCapital, annualSavings, wcImprovementPct, reductionValue, reductionPct } = base;
  const totalOpportunity = recoverableCapital + annualSavings * 3;

  // 3-year projection
  const projectionData = [
    { year: "Year 1", benefit: annualSavings + recoverableCapital },
    { year: "Year 2", benefit: annualSavings + recoverableCapital + annualSavings },
    { year: "Year 3", benefit: annualSavings + recoverableCapital + annualSavings * 2 },
  ];

  // Carrying cost breakdown pie
  const pieData = [
    { name: "Capital Cost (WACC)",  value: WACC,             pct: "12%" },
    { name: "Storage / Warehouse",  value: STORAGE_RATE,     pct: "6%"  },
    { name: "Obsolescence",         value: OBSOLESCENCE_RATE, pct: "3%" },
    { name: "Insurance",            value: INSURANCE_RATE,   pct: "2%"  },
    { name: "Handling",             value: HANDLING_RATE,    pct: "2%"  },
  ];

  // Scenario table data
  const scenarioRows = SCENARIOS.map((sc) => ({
    ...sc,
    ...calcMetrics(metrics, sc.deadLiqRate, sc.slowRedPct, sc.slowRecRate),
  }));

  // CFO Actions
  const actions = [
    {
      rank: 1,
      title: "Liquidate Dead Stock",
      desc: `Recover cash from ${metrics.dead_stock_count} non-moving SKUs through liquidation channels.`,
      saving: metrics.dead_stock_value * DEAD_LIQUIDATION_RATE,
      timeline: "0–90 days",
      effort: "Low" as const,
    },
    {
      rank: 2,
      title: "Reduce Slow-Moving Inventory",
      desc: `Sell down ${metrics.slow_mover_count} slow movers by 50% via promotions or clearance pricing.`,
      saving: metrics.slow_mover_value * SLOW_REDUCTION_PCT * SLOW_RECOVERY_RATE,
      timeline: "90–180 days",
      effort: "Medium" as const,
    },
    {
      rank: 3,
      title: "Optimise Reorder Points",
      desc: "Right-size safety stock and reorder quantities to reduce future over-purchasing.",
      saving: annualSavings * 0.2,
      timeline: "Ongoing",
      effort: "High" as const,
    },
  ];

  const effortColors: Record<"Low" | "Medium" | "High", string> = {
    Low:    "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400",
    Medium: "bg-amber-500/10 border border-amber-500/20 text-amber-400",
    High:   "bg-red-500/10 border border-red-500/20 text-red-400",
  };

  const kpiCards = [
    {
      label:    "Recoverable Capital",
      value:    formatCurrency(recoverableCapital),
      sub:      "One-time cash recovery",
      icon:     DollarSign,
      color:    "text-emerald-400",
      iconBg:   "bg-emerald-500/10",
      iconColor:"text-emerald-400",
    },
    {
      label:    "Annual Carrying Cost Savings",
      value:    formatCurrency(annualSavings),
      sub:      "Per year ongoing benefit",
      icon:     PiggyBank,
      color:    "text-blue-400",
      iconBg:   "bg-blue-500/10",
      iconColor:"text-blue-400",
    },
    {
      label:    "Working Capital Improvement",
      value:    `${wcImprovementPct.toFixed(1)}%`,
      sub:      "Of total inventory value",
      icon:     TrendingUp,
      color:    "text-violet-400",
      iconBg:   "bg-violet-500/10",
      iconColor:"text-violet-400",
    },
    {
      label:    "Inventory Reduction Opportunity",
      value:    formatCurrency(reductionValue),
      sub:      `${reductionPct.toFixed(1)}% of total inventory`,
      icon:     Target,
      color:    "text-amber-400",
      iconBg:   "bg-amber-500/10",
      iconColor:"text-amber-400",
    },
  ];

  const assumptionRows = [
    { name: "Carrying Rate",          rate: "25%",  basis: "COGS % of inventory value", standard: "20–30%" },
    { name: "Dead Stock Recovery",    rate: "30%",  basis: "Liquidation market value",   standard: "20–40%" },
    { name: "Slow Mover Reduction",   rate: "50%",  basis: "Target sell-down volume",    standard: "25–75%" },
    { name: "Slow Mover Recovery",    rate: "65%",  basis: "Clearance pricing factor",   standard: "55–75%" },
    { name: "WACC",                   rate: "12%",  basis: "Weighted avg cost of capital","standard": "8–15%" },
  ];

  return (
    <div className="flex h-screen bg-[#020617] ss-page overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Sticky header ───────────────────────────────────────────────── */}
        <header className="nav-glass sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center justify-between h-[46px] px-4 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors flex-shrink-0">
                <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
              </Link>
              <span className="text-slate-700">/</span>
              <span className="text-xs text-white font-medium flex items-center gap-1.5 truncate">
                <BarChart2 className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                Financial Impact
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors border border-white/6"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white bg-[#6366f1] hover:bg-[#4f46e5] transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>
        </header>

        {/* ── Scrollable main ─────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1040px] mx-auto px-4 py-6 space-y-5">

            {/* Page title */}
            <div className="flex items-start justify-between gap-4">
              <div>
                {companyName && (
                  <p className="text-[11px] font-semibold text-[#818cf8] mb-0.5">{companyName}</p>
                )}
                <h1 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: "Syne, sans-serif" }}>
                  Financial Impact Calculator
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  CFO-facing financial analysis — quantifying the monetary opportunity locked in non-performing inventory.
                </p>
              </div>
              <span className="text-[11px] text-slate-600 flex-shrink-0 mt-1">
                {new Date().toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>

            {/* ── Transparency banner ──────────────────────────────────────── */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <p className="text-[11px] text-slate-500">
                <span className="text-emerald-400 font-medium">Transparent calculation.</span>
                {" "}All figures are derived from your uploaded inventory data using documented assumptions. See the Assumptions panel below.
              </p>
            </div>

            {/* ── Hero card ────────────────────────────────────────────────── */}
            {/* Note: metrics.recoverable_capital = dead_stock_value + slow_mover_value (full locked capital,
                matches the dashboard KPI card). recoverableCapital here = discounted cash you can actually
                recover (30% liquidation rate for dead, 50%×65% for slow movers). */}
            <div className="card p-6 bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#0f172a] border border-violet-500/20">
              {/* Two-column: locked capital (matches dashboard) vs estimated recovery */}
              <div className="flex flex-col sm:flex-row gap-6 mb-4 pb-4 border-b border-white/8">
                <div className="flex-1">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Capital Locked in Non-Performing Stock</p>
                  <p className="text-3xl font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
                    {formatCurrency(metrics.recoverable_capital)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Matches Dashboard &ldquo;Recoverable Capital&rdquo; KPI · {metrics.dead_stock_count + metrics.slow_mover_count} SKUs
                  </p>
                </div>
                <div className="flex-1 sm:border-l sm:border-white/8 sm:pl-6">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Estimated Cash Recovery (Base Case)</p>
                  <p className="text-3xl font-bold text-emerald-400" style={{ fontFamily: "Syne, sans-serif" }}>
                    {formatCurrency(recoverableCapital)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    After liquidation discounts · Dead 30% · Slow 50%×65%
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">3-year total opportunity at base case assumptions</p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <DollarSign className="w-3 h-3" />
                  Cash Recovery {formatCurrency(recoverableCapital, true)}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <PiggyBank className="w-3 h-3" />
                  Annual Savings {formatCurrency(annualSavings, true)}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  <TrendingUp className="w-3 h-3" />
                  3-Year Benefit {formatCurrency(totalOpportunity, true)}
                </span>
              </div>
            </div>

            {/* ── 4 KPI Cards ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiCards.map((kpi) => (
                <div key={kpi.label} className="card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider leading-tight">{kpi.label}</p>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${kpi.iconBg}`}>
                      <kpi.icon className={`w-3.5 h-3.5 ${kpi.iconColor}`} />
                    </div>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold tabular-nums ${kpi.color}`}>{kpi.value}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{kpi.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Two-column: Scenario Table + Pie Chart ───────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Scenario Analysis */}
              <div className="card p-6 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-white">Scenario Analysis</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Three assumption sets — conservative, base, and optimistic recovery rates.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left py-2 pr-3 text-[10px] text-slate-500 font-medium">Scenario</th>
                        <th className="text-right py-2 px-2 text-[10px] text-slate-500 font-medium">Capital</th>
                        <th className="text-right py-2 px-2 text-[10px] text-slate-500 font-medium">Savings/yr</th>
                        <th className="text-right py-2 pl-2 text-[10px] text-slate-500 font-medium">WC%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarioRows.map((sc) => (
                        <tr
                          key={sc.label}
                          className={`border-b border-white/4 ${sc.isBase ? "bg-[#6366f1]/5" : ""}`}
                        >
                          <td className="py-2.5 pr-3">
                            <span className={`inline-flex items-center gap-1 ${sc.isBase ? "text-white font-semibold" : "text-slate-400"}`}>
                              {sc.label}
                              {sc.isBase && (
                                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-[#6366f1]/15 border border-[#6366f1]/30 text-[#818cf8]">
                                  Base
                                </span>
                              )}
                            </span>
                          </td>
                          <td className={`py-2.5 px-2 text-right tabular-nums ${sc.isBase ? "text-emerald-400 font-semibold" : "text-slate-400"}`}>
                            {formatCurrency(sc.recoverableCapital, true)}
                          </td>
                          <td className={`py-2.5 px-2 text-right tabular-nums ${sc.isBase ? "text-blue-400 font-semibold" : "text-slate-400"}`}>
                            {formatCurrency(sc.annualSavings, true)}
                          </td>
                          <td className={`py-2.5 pl-2 text-right tabular-nums ${sc.isBase ? "text-violet-400 font-semibold" : "text-slate-400"}`}>
                            {sc.wcImprovementPct.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  Liquidation rates, reduction targets, and recovery rates vary by channel and execution quality.
                </p>
              </div>

              {/* Carrying Cost Breakdown Pie */}
              <div className="card p-6 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-white">Carrying Cost Breakdown</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Components of the 25% annual inventory carrying rate.</p>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="45%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={entry.name} fill={CARRYING_BREAKDOWN_COLORS[i]} fillOpacity={0.85} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(v: any) => [`${(Number(v) * 100).toFixed(0)}%`]}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 10, color: "#94a3b8", paddingTop: 8 }}
                        formatter={(value: string) => {
                          const item = pieData.find((d) => d.name === value);
                          return `${value} (${item?.pct ?? ""})`;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ── 3-Year Projection bar chart ──────────────────────────────── */}
            <div className="card p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-white">3-Year Cumulative Benefit Projection</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Year 1 = capital release + first year savings. Years 2–3 add ongoing annual carrying cost savings.
                </p>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectionData} margin={{ top: 4, right: 20, bottom: 0, left: 8 }}>
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#475569" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => formatCurrency(v, true)}
                    />
                    <Tooltip content={<CurrencyTooltip />} />
                    <Bar dataKey="benefit" name="Cumulative Benefit" radius={[6, 6, 0, 0]} maxBarSize={64}>
                      {projectionData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={i === 0 ? "#6366f1" : i === 1 ? "#818cf8" : "#a5b4fc"}
                          fillOpacity={0.9}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#6366f1]" />Year 1
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#818cf8]" />Year 2
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#a5b4fc]" />Year 3
                </span>
              </div>
            </div>

            {/* ── CFO Action Priorities ────────────────────────────────────── */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-white">CFO Action Priorities</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Ranked by financial impact and execution speed.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {actions.map((action) => (
                  <div key={action.rank} className="card p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#6366f1]/15 border border-[#6366f1]/30 text-[#818cf8] text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                          {action.rank}
                        </span>
                        <p className="text-xs font-semibold text-white leading-tight">{action.title}</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{action.desc}</p>
                    <div className="pt-1 border-t border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-600">Expected saving</span>
                        <span className="text-xs font-bold text-emerald-400 tabular-nums">{formatCurrency(action.saving, true)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-600">Timeline</span>
                        <span className="text-[10px] text-slate-400">{action.timeline}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-600">Effort</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${effortColors[action.effort]}`}>
                          {action.effort}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Supporting Data ──────────────────────────────────────────── */}
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-white">Supporting Data</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  The exact inventory items driving the financial figures above. These match the Dashboard KPI cards.
                </p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Dead Stock items */}
                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                    <div>
                      <p className="text-xs font-semibold text-white">Dead Stock</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {metrics.dead_stock_count} SKUs · {formatCurrency(metrics.dead_stock_value, true)} value · {formatCurrency(metrics.dead_stock_value * DEAD_LIQUIDATION_RATE, true)} recoverable
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {metrics.dead_stock_count} items
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    {metrics.top_dead_stock.length > 0 ? (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/5">
                            {["SKU", "Product", "ABC", "Value", "Recovery (30%)"].map(h => (
                              <th key={h} className="px-4 py-2 text-left text-[10px] text-slate-600 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/4">
                          {metrics.top_dead_stock.slice(0, 8).map(item => (
                            <tr key={item.sku_id} className="hover:bg-white/2">
                              <td className="px-4 py-2 font-mono text-[10px] text-slate-500">{item.sku_id}</td>
                              <td className="px-4 py-2 text-slate-300 max-w-[120px] truncate">{item.product_name}</td>
                              <td className="px-4 py-2">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">{item.abc_class}</span>
                              </td>
                              <td className="px-4 py-2 text-white font-medium tabular-nums">{formatCurrency(item.inventory_value, true)}</td>
                              <td className="px-4 py-2 text-emerald-400 tabular-nums">{formatCurrency(item.inventory_value * DEAD_LIQUIDATION_RATE, true)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="px-5 py-6 text-center text-xs text-slate-500">No dead stock detected</div>
                    )}
                  </div>
                  {metrics.top_dead_stock.length > 8 && (
                    <div className="px-5 py-2 border-t border-white/5 text-center text-[10px] text-slate-600">
                      +{metrics.top_dead_stock.length - 8} more items not shown
                    </div>
                  )}
                </div>

                {/* Slow movers */}
                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                    <div>
                      <p className="text-xs font-semibold text-white">Slow Moving Stock</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {metrics.slow_mover_count} SKUs · {formatCurrency(metrics.slow_mover_value, true)} value · {formatCurrency(metrics.slow_mover_value * SLOW_REDUCTION_PCT * SLOW_RECOVERY_RATE, true)} recoverable
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {metrics.slow_mover_count} items
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    {metrics.all_skus?.filter(s => s.scenario === "SLOW").length > 0 ? (
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/5">
                            {["SKU", "Product", "ABC", "Value", "Days Cover"].map(h => (
                              <th key={h} className="px-4 py-2 text-left text-[10px] text-slate-600 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/4">
                          {(metrics.all_skus ?? metrics.top_risk_items)
                            .filter(s => s.scenario === "SLOW")
                            .sort((a, b) => b.inventory_value - a.inventory_value)
                            .slice(0, 8)
                            .map(item => (
                            <tr key={item.sku_id} className="hover:bg-white/2">
                              <td className="px-4 py-2 font-mono text-[10px] text-slate-500">{item.sku_id}</td>
                              <td className="px-4 py-2 text-slate-300 max-w-[120px] truncate">{item.product_name}</td>
                              <td className="px-4 py-2">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">{item.abc_class}</span>
                              </td>
                              <td className="px-4 py-2 text-white font-medium tabular-nums">{formatCurrency(item.inventory_value, true)}</td>
                              <td className="px-4 py-2 text-amber-400 tabular-nums">
                                {isFinite(item.days_stock_remaining) ? `${Math.round(item.days_stock_remaining)}d` : "∞"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="px-5 py-6 text-center text-xs text-slate-500">No slow moving items detected</div>
                    )}
                  </div>
                  {metrics.slow_mover_count > 8 && (
                    <div className="px-5 py-2 border-t border-white/5 text-center text-[10px] text-slate-600">
                      +{metrics.slow_mover_count - 8} more items not shown
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* ── Assumptions & Methodology ────────────────────────────────── */}
            <div className="card p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-white">Assumptions &amp; Methodology</p>
                <p className="text-[11px] text-slate-500 mt-0.5">All rates used in this analysis and their industry basis.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left py-2 pr-4 text-[10px] text-slate-500 font-medium">Assumption</th>
                      <th className="text-right py-2 px-3 text-[10px] text-slate-500 font-medium">Rate</th>
                      <th className="text-left py-2 px-3 text-[10px] text-slate-500 font-medium">Basis</th>
                      <th className="text-right py-2 pl-3 text-[10px] text-slate-500 font-medium">Industry Standard</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assumptionRows.map((row) => (
                      <tr key={row.name} className="border-b border-white/4">
                        <td className="py-2.5 pr-4 text-slate-300 font-medium">{row.name}</td>
                        <td className="py-2.5 px-3 text-right text-violet-400 font-bold tabular-nums">{row.rate}</td>
                        <td className="py-2.5 px-3 text-slate-500">{row.basis}</td>
                        <td className="py-2.5 pl-3 text-right text-slate-600 tabular-nums">{row.standard}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-600 leading-relaxed border-t border-white/5 pt-3">
                <span className="text-slate-500 font-medium">Disclaimer:</span>{" "}
                All figures are estimates. Actual results depend on liquidation channels, market conditions, and execution capability.
                This analysis is provided for planning purposes only and does not constitute financial advice.
              </p>
            </div>

          </div>
        </main>
      </div>
      <DemoBanner />
    </div>
  );
}
