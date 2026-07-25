"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, RefreshCw, Upload, Search, ChevronUp, ChevronDown } from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { formatCurrency, formatDaysOfCover, truncate, getRiskColor } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { readStoredDashboardMetrics } from "@/lib/dashboard-storage";
import type { DashboardMetrics, AnalyzedSKU } from "@/lib/types";

const STATUS_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  CRITICAL: { bg: "bg-red-500/15",    text: "text-red-300",    label: "Critical" },
  DEAD:     { bg: "bg-red-950/60",    text: "text-[#FDA4AF]",  label: "Dead stock" },
  SLOW:     { bg: "bg-amber-500/15",  text: "text-amber-300",  label: "Slow mover" },
  WATCH:    { bg: "bg-blue-500/15",   text: "text-blue-300",   label: "Watch" },
  HEALTHY:  { bg: "bg-emerald-500/15",text: "text-emerald-300",label: "Healthy" },
};

const ABC_BADGES: Record<string, { bg: string; text: string }> = {
  A: { bg: "bg-indigo-500/15", text: "text-indigo-300" },
  B: { bg: "bg-blue-500/15",   text: "text-blue-300" },
  C: { bg: "bg-emerald-500/15",text: "text-emerald-300" },
};

type SortKey = "stockout_risk_score" | "days_stock_remaining" | "inventory_value" | "lead_time_days";
type SortDir = "asc" | "desc";
type ScenarioFilter = "ALL" | "CRITICAL" | "DEAD" | "SLOW" | "WATCH";

export default function RiskAnalysisPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [noData, setNoData] = useState(false);
  const [search, setSearch] = useState("");
  const [scenarioFilter, setScenarioFilter] = useState<ScenarioFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("stockout_risk_score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    try {
      const storedMetrics = readStoredDashboardMetrics({ fallbackToLocalStorage: true });
      if (storedMetrics) setMetrics(storedMetrics);
      else setNoData(true);
    } catch { setNoData(true); }
  }, []);

  const items: AnalyzedSKU[] = metrics?.top_risk_items ?? [];

  const filtered = useMemo(() => {
    let list = items;
    if (scenarioFilter !== "ALL") list = list.filter((i) => i.scenario === scenarioFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        i.sku_id.toLowerCase().includes(q) ||
        i.product_name.toLowerCase().includes(q) ||
        (i.category ?? "").toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }, [items, search, scenarioFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const scenarioCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: items.length, CRITICAL: 0, DEAD: 0, SLOW: 0, WATCH: 0 };
    for (const i of items) { if (counts[i.scenario] !== undefined) counts[i.scenario]++; }
    return counts;
  }, [items]);

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

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col
      ? (sortDir === "desc" ? <ChevronDown className="w-3 h-3 inline ml-0.5" /> : <ChevronUp className="w-3 h-3 inline ml-0.5" />)
      : null;

  const SCENARIO_TABS: { key: ScenarioFilter; label: string; color: string }[] = [
    { key: "ALL",      label: "All",         color: "text-slate-300" },
    { key: "CRITICAL", label: "Critical",    color: "text-red-400" },
    { key: "DEAD",     label: "Dead stock",  color: "text-pink-400" },
    { key: "SLOW",     label: "Slow mover",  color: "text-amber-400" },
    { key: "WATCH",    label: "Watch",       color: "text-blue-400" },
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
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Risk Analysis
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-5">

            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: "Syne, sans-serif" }}>
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Full Risk Analysis
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                All {items.length} flagged items — sorted by risk score. Use filters to narrow by scenario.
              </p>
            </div>

            {/* Summary pills */}
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Critical", value: scenarioCounts.CRITICAL, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
                { label: "Dead stock", value: scenarioCounts.DEAD, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20" },
                { label: "Slow movers", value: scenarioCounts.SLOW, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                { label: "Watch", value: scenarioCounts.WATCH, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
              ].map((p) => (
                <div key={p.label} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs ${p.bg}`}>
                  <span className={`font-bold text-base ${p.color}`}>{p.value}</span>
                  <span className="text-slate-400">{p.label}</span>
                </div>
              ))}
            </div>

            {/* Filters row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Scenario tabs */}
              <div className="flex items-center gap-0.5 bg-white/4 rounded-xl p-1">
                {SCENARIO_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setScenarioFilter(tab.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors",
                      scenarioFilter === tab.key
                        ? `bg-white/10 ${tab.color}`
                        : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    {tab.label}
                    <span className="ml-1.5 text-[10px] opacity-60">({scenarioCounts[tab.key]})</span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search SKU, product, category…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/5 border border-white/8 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#6366f1]/50"
                />
              </div>

              <span className="text-[11px] text-slate-600 ml-auto">
                Showing {filtered.length} of {items.length} items
              </span>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-white/5">
                      {[
                        { label: "SKU", key: null },
                        { label: "Product", key: null },
                        { label: "ABC", key: null },
                        { label: "Status", key: null },
                        { label: "Days left", key: "days_stock_remaining" as SortKey },
                        { label: "Lead time", key: "lead_time_days" as SortKey },
                        { label: "Risk", key: "stockout_risk_score" as SortKey },
                        { label: "Value", key: "inventory_value" as SortKey },
                        { label: "Action", key: null },
                      ].map((col) => (
                        <th
                          key={col.label}
                          onClick={col.key ? () => toggleSort(col.key!) : undefined}
                          className={cn(
                            "px-4 py-2.5 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider",
                            col.key && "cursor-pointer hover:text-slate-300 select-none"
                          )}
                        >
                          {col.label}
                          {col.key && <SortIcon col={col.key} />}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-xs text-slate-500">
                          No items match your filter.
                        </td>
                      </tr>
                    ) : filtered.map((item, i) => {
                      const status = STATUS_BADGES[item.scenario] ?? STATUS_BADGES.HEALTHY;
                      const abc = ABC_BADGES[item.abc_class] ?? ABC_BADGES.C;
                      const daysLeft = isFinite(item.days_stock_remaining) ? Math.floor(item.days_stock_remaining) : "∞";
                      const riskColor = getRiskColor(item.stockout_risk_score);
                      const daysIsCritical = typeof daysLeft === "number" && daysLeft < item.lead_time_days;

                      return (
                        <tr
                          key={item.sku_id}
                          className={cn(
                            "border-b border-white/4 last:border-0 hover:bg-white/2 transition-colors",
                            i === 0 && "bg-white/1"
                          )}
                        >
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{item.sku_id}</td>
                          <td className="px-4 py-3 text-xs font-medium text-white max-w-[220px]">
                            {truncate(item.product_name, 30)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("badge", abc.bg, abc.text)}>{item.abc_class}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn("badge", status.bg, status.text)}>{status.label}</span>
                          </td>
                          <td className={cn("px-4 py-3 text-xs font-medium", daysIsCritical ? "text-red-400" : "text-slate-300")}>
                            {daysLeft === "∞" ? "∞" : <span title={`${daysLeft} days`}>{formatDaysOfCover(daysLeft)}</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">{item.lead_time_days}d</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <div className="risk-bar-track">
                                <div className="risk-bar-fill" style={{ width: `${item.stockout_risk_score}%`, background: riskColor }} />
                              </div>
                              <span className="text-[11px] text-slate-400">{item.stockout_risk_score}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                            {formatCurrency(item.inventory_value, true)}
                          </td>
                          <td className="px-4 py-3">
                            <button className="text-xs text-[#818cf8] hover:text-white transition-colors whitespace-nowrap">
                              {item.scenario === "CRITICAL" ? "Order now" :
                               item.scenario === "DEAD" ? "Liquidate" :
                               item.scenario === "SLOW" ? "Promote" : "Review"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
