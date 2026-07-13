"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Brain, AlertTriangle, DollarSign, Zap, FileDown, RefreshCw,
  CheckCircle2, ShieldAlert, Menu, Upload, TrendingUp, TrendingDown,
  Package, BarChart2, Clock, Target, Activity, ChevronRight,
  ShoppingCart, Ban, RotateCcw, Star,
} from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { getDemoData } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/demo-loader";
import { generateExecutiveSummary } from "@/lib/insights-generator";
import { openHtmlReport } from "@/lib/html-report-generator";
import { formatCurrency, getHealthColor, getHealthLabel, cn } from "@/lib/utils";
import type { DashboardMetrics } from "@/lib/types";
import type { ExecutiveSummary } from "@/lib/insights-generator";

type Audience = "ceo" | "supply_chain" | "procurement";

// ── Metric tile ────────────────────────────────────────────────────────────────
function Tile({
  label, value, sub, color = "text-white", bg = "bg-white/4", border = "border-white/8", icon: Icon,
}: {
  label: string; value: string; sub?: string;
  color?: string; bg?: string; border?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className={`rounded-xl border p-3 ${bg} ${border}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider leading-none">{label}</span>
        {Icon && <Icon className={`w-3 h-3 ${color} opacity-60`} />}
      </div>
      <div className={`text-lg font-bold leading-none mb-0.5 ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-600 leading-tight mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Action row ─────────────────────────────────────────────────────────────────
function ActionRow({
  n, action, rationale, timeline, impact, urgent,
}: {
  n: number; action: string; rationale: string; timeline: string; impact: string; urgent?: boolean;
}) {
  const tlColor = timeline === "Immediate" ? "text-red-400 bg-red-500/10 border-red-500/20"
    : timeline === "This week" ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
    : "text-blue-400 bg-blue-500/10 border-blue-500/20";
  return (
    <div className={`flex gap-3 px-4 py-3 rounded-xl border ${urgent ? "bg-red-500/5 border-red-500/15" : "bg-white/2 border-white/6"}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold
        ${urgent ? "bg-red-500/20 text-red-400" : "bg-[#6366f1]/20 text-[#818cf8]"}`}>
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap mb-0.5">
          <p className={`text-xs font-semibold flex-1 min-w-0 ${urgent ? "text-red-300" : "text-white"}`}>{action}</p>
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0 ${tlColor}`}>
            <Clock className="w-2 h-2" />{timeline}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed mb-1">{rationale}</p>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
          <span className="text-[10px] text-emerald-400">{impact}</span>
        </div>
      </div>
    </div>
  );
}

// ── Risk badge row ─────────────────────────────────────────────────────────────
function RiskRow({ label, count, value, action, color, dot }: {
  label: string; count: number; value?: string; action: string;
  color: string; dot: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/4 last:border-0">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
      <span className="text-xs text-slate-400 flex-1">{label}</span>
      <span className={`text-xs font-bold tabular-nums ${color}`}>{count} SKU{count !== 1 ? "s" : ""}</span>
      {value && <span className="text-[11px] text-slate-500 tabular-nums w-14 text-right">{value}</span>}
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${color} bg-white/3 border-white/10 w-24 text-center flex-shrink-0`}>
        {action}
      </span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// CEO BRIEF — Strategic & Financial  (Board-level one-pager)
// ══════════════════════════════════════════════════════════════════
function CEOBrief({ metrics, summary, visible }: { metrics: DashboardMetrics; summary: ExecutiveSummary; visible: boolean }) {
  const hColor = getHealthColor(summary.health_overview.score);
  const status = summary.health_overview.status;
  const urgentRisks = summary.key_risks.filter(r => r.severity === "critical" || r.severity === "high");
  const ceoActions = summary.recommended_actions.slice(0, 4);

  // Annualised consumption exposure from critical stockouts
  const consumptionExposure = metrics.top_risk_items
    .filter(r => r.scenario === "CRITICAL")
    .reduce((s, r) => s + r.units_sold_30d * r.unit_price * 12, 0);

  return (
    <div className="space-y-3" style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s ease" }}>

      {/* Document header */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-white/1">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#6366f1]/15 flex items-center justify-center">
              <Star className="w-3.5 h-3.5 text-[#818cf8]" />
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-wide uppercase">CEO · Inventory Intelligence Brief</p>
              <p className="text-[10px] text-slate-500">{new Date(summary.generated_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex flex-col items-center px-3 py-1.5 rounded-xl border"
              style={{ background: `${hColor}10`, borderColor: `${hColor}25` }}>
              <span className="text-xl font-bold leading-none" style={{ color: hColor }}>{summary.health_overview.score}</span>
              <span className="text-[9px] font-semibold" style={{ color: hColor }}>{status}</span>
            </div>
          </div>
        </div>

        {/* Situation narrative */}
        <div className="px-5 py-3 border-b border-white/5">
          <p className="text-[10px] text-[#818cf8] font-semibold uppercase tracking-wider mb-1.5">Situation Assessment</p>
          <p className="text-xs text-slate-300 leading-relaxed">{summary.health_overview.body}</p>
        </div>

        {/* Financial KPIs */}
        <div className="px-5 py-3 border-b border-white/5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2.5">Financial Position</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Tile label="Total Inventory" value={formatCurrency(metrics.total_inventory_value, true)} sub="On-hand stock value" icon={DollarSign} />
            <Tile label="Capital at Risk" value={formatCurrency(metrics.dead_stock_value + metrics.slow_mover_value, true)}
              sub={`${metrics.dead_stock_count + metrics.slow_mover_count} problem SKUs`}
              color="text-amber-400" bg="bg-amber-500/6" border="border-amber-500/15" icon={AlertTriangle} />
            <Tile label="Est. Recovery" value={formatCurrency(metrics.recoverable_capital, true)}
              sub="Policy assumption"
              color="text-emerald-400" bg="bg-emerald-500/6" border="border-emerald-500/15" icon={TrendingUp} />
            <Tile label="Annual Carry Cost" value={formatCurrency(metrics.annual_carrying_cost, true)}
              sub="25% holding rate / yr"
              color="text-slate-300" icon={RotateCcw} />
          </div>
        </div>

        {/* Portfolio status + turnover */}
        <div className="px-5 py-3 border-b border-white/5">
          <div className="grid grid-cols-5 gap-3">
            {/* Portfolio composition */}
            <div className="col-span-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Portfolio Composition</p>
              <div className="space-y-1.5">
                <RiskRow label="Critical stockout risk" count={metrics.critical_stockout_count}
                  value={consumptionExposure > 0 ? formatCurrency(consumptionExposure, true) + "/yr" : undefined}
                  action="Immediate PO" color="text-red-400" dot="bg-red-400" />
                <RiskRow label="Dead stock (zero velocity)" count={metrics.dead_stock_count}
                  value={formatCurrency(metrics.dead_stock_value, true)}
                  action="Liquidate" color="text-purple-400" dot="bg-purple-400" />
                <RiskRow label="Slow moving (excess stock)" count={metrics.slow_mover_count}
                  value={formatCurrency(metrics.slow_mover_value, true)}
                  action="Promote/Suspend" color="text-amber-400" dot="bg-amber-400" />
                <RiskRow label="Healthy / performing" count={metrics.risk_distribution.low}
                  action="Maintain" color="text-emerald-400" dot="bg-emerald-400" />
              </div>
              {/* Composition bar */}
              <div className="mt-2 flex h-2 rounded-full overflow-hidden gap-px">
                {[
                  { n: metrics.critical_stockout_count, c: "#ef4444" },
                  { n: metrics.dead_stock_count,        c: "#a855f7" },
                  { n: metrics.slow_mover_count,        c: "#f59e0b" },
                  { n: metrics.risk_distribution.low,   c: "#10b981" },
                ].map((seg, i) => {
                  const p = metrics.total_skus > 0 ? (seg.n / metrics.total_skus) * 100 : 0;
                  return p > 0 ? <div key={i} style={{ width: `${p}%`, backgroundColor: seg.c }} /> : null;
                })}
              </div>
            </div>
            {/* Key ratios */}
            <div className="col-span-2 space-y-1.5">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Key Ratios</p>
              {[
                {
                  label: "Inventory Turnover",
                  value: `${metrics.turnover_ratio.toFixed(1)}×`,
                  bench: "snapshot estimate",
                  good: false,
                  tone: "neutral",
                },
                {
                  label: "A-Class Consumption Share",
                  value: `${metrics.abc_summary.a_revenue_pct}%`,
                  bench: "65–70% target",
                  good: metrics.abc_summary.a_revenue_pct >= 65,
                  tone: metrics.abc_summary.a_revenue_pct >= 65 ? "good" : "critical",
                },
                {
                  label: "Problem SKU Rate",
                  value: `${Math.round(((metrics.dead_stock_count + metrics.slow_mover_count) / metrics.total_skus) * 100)}%`,
                  bench: "<10% threshold",
                  good: (metrics.dead_stock_count + metrics.slow_mover_count) / metrics.total_skus < 0.10,
                  tone: (metrics.dead_stock_count + metrics.slow_mover_count) / metrics.total_skus < 0.10 ? "good" : "critical",
                },
              ].map(r => (
                <div key={r.label} className={`px-3 py-2 rounded-lg border ${r.tone === "neutral" ? "bg-white/3 border-white/8" : r.good ? "bg-emerald-500/5 border-emerald-500/15" : "bg-red-500/5 border-red-500/15"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">{r.label}</span>
                    <span className={`text-xs font-bold ${r.tone === "neutral" ? "text-slate-300" : r.good ? "text-emerald-400" : "text-red-400"}`}>{r.value}</span>
                  </div>
                  <div className="text-[9px] text-slate-600 mt-0.5">{r.bench}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Executive actions */}
        <div className="px-5 py-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2.5">Decisions Required</p>
          <div className="space-y-2">
            {ceoActions.map((a, i) => (
              <ActionRow key={i} n={i + 1}
                action={a.action} rationale={a.rationale}
                timeline={a.timeline} impact={a.estimated_impact}
                urgent={a.timeline === "Immediate"} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// SUPPLY CHAIN BRIEF — Operational one-pager
// ══════════════════════════════════════════════════════════════════
function SupplyChainBrief({ metrics, summary, visible }: { metrics: DashboardMetrics; summary: ExecutiveSummary; visible: boolean }) {
  const scActions = summary.recommended_actions.filter(a =>
    a.owner === "Supply Chain" || a.owner === "Operations" || a.owner === "Finance"
  );
  const allActions = scActions.length ? scActions : summary.recommended_actions.slice(0, 4);

  return (
    <div className="space-y-3" style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s ease" }}>
      <div className="card overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5 bg-white/1">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-white tracking-wide uppercase">Supply Chain Director · Operations Brief</p>
            <p className="text-[10px] text-slate-500">{new Date(summary.generated_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/4 border border-white/8">
            <BarChart2 className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-400 font-medium">{metrics.total_skus} SKUs analyzed</span>
          </div>
        </div>

        {/* Alert KPIs */}
        <div className="px-5 py-3 border-b border-white/5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2.5">Stock Alert Summary</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Tile label="Critical Stockout" value={String(metrics.critical_stockout_count)}
              sub="Lead-time critical"
              color={metrics.critical_stockout_count > 0 ? "text-red-400" : "text-emerald-400"}
              bg={metrics.critical_stockout_count > 0 ? "bg-red-500/8" : "bg-emerald-500/6"}
              border={metrics.critical_stockout_count > 0 ? "border-red-500/20" : "border-emerald-500/15"}
              icon={AlertTriangle} />
            <Tile label="At Reorder Point" value={String(metrics.reorder_count)}
              sub="Policy reorder action"
              color={metrics.reorder_count > 0 ? "text-amber-400" : "text-slate-300"}
              bg={metrics.reorder_count > 0 ? "bg-amber-500/8" : "bg-white/4"}
              border={metrics.reorder_count > 0 ? "border-amber-500/20" : "border-white/8"}
              icon={ShoppingCart} />
            <Tile label="Inventory Turnover" value={`${metrics.turnover_ratio.toFixed(1)}×`}
              sub="Snapshot estimate; compare to company targets"
              color="text-slate-300"
              bg="bg-white/3"
              border="border-white/8"
              icon={TrendingUp} />
            <Tile label="Dead Stock SKUs" value={String(metrics.dead_stock_count)}
              sub={`${formatCurrency(metrics.dead_stock_value, true)} tied up`}
              color={metrics.dead_stock_count > 0 ? "text-purple-400" : "text-emerald-400"}
              bg={metrics.dead_stock_count > 0 ? "bg-purple-500/6" : "bg-emerald-500/6"}
              border={metrics.dead_stock_count > 0 ? "border-purple-500/15" : "border-emerald-500/15"}
              icon={Ban} />
          </div>
        </div>

        {/* Risk breakdown + ABC */}
        <div className="px-5 py-3 border-b border-white/5">
          <div className="grid grid-cols-5 gap-4">
            {/* Scenario breakdown */}
            <div className="col-span-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Inventory Status by Category</p>
              <div className="space-y-1">
                {[
                  { label: "Critical (stock may run out before replenishment arrives)", count: metrics.risk_distribution.critical, value: formatCurrency(metrics.top_risk_items.filter(s => s.scenario === "CRITICAL").reduce((a, s) => a + s.inventory_value, 0), true), action: "Review replenishment", color: "text-red-400", dot: "bg-red-400" },
                  { label: "Watch (approaching reorder threshold)", count: metrics.risk_distribution.watch,    value: formatCurrency(metrics.top_risk_items.filter(s => s.scenario === "WATCH").reduce((a, s) => a + s.inventory_value, 0), true), action: "Review now", color: "text-orange-400", dot: "bg-orange-400" },
                  { label: "Slow moving (excess accumulation)",    count: metrics.risk_distribution.elevated, value: formatCurrency(metrics.slow_mover_value, true), action: "Suspend orders", color: "text-amber-400", dot: "bg-amber-400" },
                  { label: "Dead stock (zero velocity)",           count: metrics.risk_distribution.dead,     value: formatCurrency(metrics.dead_stock_value, true), action: "Liquidate", color: "text-purple-400", dot: "bg-purple-400" },
                  { label: "Healthy (normal operations)",          count: metrics.risk_distribution.low,      value: undefined, action: "Maintain", color: "text-emerald-400", dot: "bg-emerald-400" },
                ].map(r => <RiskRow key={r.label} {...r} />)}
              </div>
            </div>
            {/* ABC analysis */}
            <div className="col-span-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">ABC Classification</p>
              <div className="space-y-2">
                {[
                  { cls: "A", label: "High annual-consumption items", count: metrics.abc_summary.a_count, pct: metrics.abc_summary.a_revenue_pct, target: 65, color: "text-emerald-400", bg: "bg-emerald-500/8", border: "border-emerald-500/15", note: "Prioritise service levels" },
                  { cls: "B", label: "Mid-tier items", count: metrics.abc_summary.b_count, pct: metrics.abc_summary.b_revenue_pct, target: null, color: "text-blue-400", bg: "bg-blue-500/8", border: "border-blue-500/15", note: "Standard replenishment" },
                  { cls: "C", label: "Low-value / tail items", count: metrics.abc_summary.c_count, pct: metrics.abc_summary.c_revenue_pct, target: null, color: "text-slate-400", bg: "bg-white/3", border: "border-white/8", note: "Minimise stock holding" },
                ].map(a => (
                  <div key={a.cls} className={`rounded-lg border px-3 py-2 ${a.bg} ${a.border}`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold ${a.color}`}>{a.cls}-Class</span>
                        <span className="text-[10px] text-slate-500">{a.count} SKUs</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-bold tabular-nums ${a.color}`}>{a.pct}%</span>
                        <span className="text-[9px] text-slate-600">of value</span>
                        {a.target && <span className={`text-[9px] ${a.pct >= a.target ? "text-emerald-500" : "text-amber-500"}`}>{a.pct >= a.target ? "✓" : "↓"}{a.target}%</span>}
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-600">{a.note}</p>
                  </div>
                ))}
              </div>
              {/* Working capital summary */}
              <div className="mt-2 px-3 py-2 rounded-lg bg-white/3 border border-white/6">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Working Capital</p>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Est. Recovery capital</span>
                  <span className="text-emerald-400 font-bold">{formatCurrency(metrics.recoverable_capital, true)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Annual carrying cost</span>
                  <span className="text-orange-400 font-bold">{formatCurrency(metrics.annual_carrying_cost, true)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Operational actions */}
        <div className="px-5 py-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2.5">Operational Actions Required</p>
          <div className="space-y-2">
            {allActions.map((a, i) => (
              <ActionRow key={i} n={i + 1}
                action={a.action} rationale={a.rationale}
                timeline={a.timeline} impact={a.estimated_impact}
                urgent={a.timeline === "Immediate"} />
            ))}
            {allActions.length === 0 && (
              <div className="px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-xs text-emerald-400">
                No critical operational actions required at this time. Continue standard replenishment cycles.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PROCUREMENT BRIEF — Purchasing action one-pager
// ══════════════════════════════════════════════════════════════════
function ProcurementBrief({ metrics, summary, visible }: { metrics: DashboardMetrics; summary: ExecutiveSummary; visible: boolean }) {
  const criticalItems = metrics.top_risk_items.filter(s => s.scenario === "CRITICAL").slice(0, 5);
  const watchItems    = metrics.top_risk_items.filter(s => s.scenario === "WATCH").slice(0, 4);
  const deadItems     = metrics.top_dead_stock.slice(0, 4);

  const procActions = summary.recommended_actions.filter(a =>
    a.owner === "Procurement" || a.owner === "Finance"
  );
  const allActions = procActions.length ? procActions : summary.recommended_actions.slice(0, 3);

  return (
    <div className="space-y-3" style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s ease" }}>
      <div className="card overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5 bg-white/1">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-white tracking-wide uppercase">Procurement Manager · Purchasing Action Brief</p>
            <p className="text-[10px] text-slate-500">{new Date(summary.generated_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {metrics.critical_stockout_count > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/25 text-[10px] font-semibold text-red-400">
                <AlertTriangle className="w-2.5 h-2.5" />
                {metrics.critical_stockout_count} Replenishment Review Required
              </span>
            )}
          </div>
        </div>

        {/* Purchasing queue KPIs */}
        <div className="px-5 py-3 border-b border-white/5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2.5">Purchasing Queue Status</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Tile label="Replenishment Review" value={String(metrics.critical_stockout_count)}
              sub="Action today"
              color={metrics.critical_stockout_count > 0 ? "text-red-400" : "text-emerald-400"}
              bg={metrics.critical_stockout_count > 0 ? "bg-red-500/10" : "bg-emerald-500/6"}
              border={metrics.critical_stockout_count > 0 ? "border-red-500/25" : "border-emerald-500/15"}
              icon={AlertTriangle} />
            <Tile label="Reorder Queue" value={String(metrics.reorder_count)}
              sub="This week action"
              color={metrics.reorder_count > 0 ? "text-amber-400" : "text-slate-300"}
              bg={metrics.reorder_count > 0 ? "bg-amber-500/8" : "bg-white/4"}
              border={metrics.reorder_count > 0 ? "border-amber-500/20" : "border-white/8"}
              icon={Package} />
            <Tile label="Suspend Orders" value={String(metrics.dead_stock_count)}
              sub={`${formatCurrency(metrics.dead_stock_value, true)} dead value`}
              color="text-purple-400" bg="bg-purple-500/6" border="border-purple-500/15"
              icon={Ban} />
            <Tile label="Hold / Reduce" value={String(metrics.slow_mover_count)}
              sub={`${formatCurrency(metrics.slow_mover_value, true)} slow value`}
              color="text-amber-400" bg="bg-amber-500/6" border="border-amber-500/15"
              icon={TrendingDown} />
          </div>
        </div>

        {/* Three columns: Critical | Watch | Suspend */}
        <div className="px-5 py-3 border-b border-white/5">
          <div className="grid grid-cols-3 gap-3">

            {/* Column 1: Emergency orders */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">Raise PO Immediately</p>
              </div>
              {criticalItems.length === 0 ? (
                <div className="text-[10px] text-slate-600 italic px-2 py-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                  No critical items — no emergency orders required
                </div>
              ) : (
                <div className="space-y-1.5">
                  {criticalItems.map(item => (
                    <div key={item.sku_id} className="px-2.5 py-2 rounded-lg bg-red-500/6 border border-red-500/15">
                      <p className="text-[11px] font-semibold text-white truncate mb-0.5">{item.product_name}</p>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] text-red-400 font-medium">
                          {isFinite(item.days_stock_remaining) ? `${Math.round(item.days_stock_remaining)}d left` : "0d left"}
                        </span>
                        <span className="text-[9px] text-slate-500">{item.abc_class}-class · LT {item.lead_time_days}d</span>
                      </div>
                      {item.reorder_qty_eoq > 0 && (
                        <p className="text-[9px] text-amber-400 mt-0.5">Order {item.reorder_qty_eoq.toLocaleString()} units (EOQ)</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column 2: Review this week */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Review This Week</p>
              </div>
              {watchItems.length === 0 ? (
                <div className="text-[10px] text-slate-600 italic px-2 py-3 rounded-lg bg-white/3 border border-white/6">
                  No watch-list items — standard cycle applies
                </div>
              ) : (
                <div className="space-y-1.5">
                  {watchItems.map(item => (
                    <div key={item.sku_id} className="px-2.5 py-2 rounded-lg bg-amber-500/6 border border-amber-500/15">
                      <p className="text-[11px] font-semibold text-white truncate mb-0.5">{item.product_name}</p>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] text-amber-400 font-medium">
                          {isFinite(item.days_stock_remaining) ? `${Math.round(item.days_stock_remaining)}d cover` : "—"}
                        </span>
                        <span className="text-[9px] text-slate-500">{item.abc_class}-class</span>
                      </div>
                      <p className="text-[9px] text-slate-500 mt-0.5">Verify reorder schedule</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Column 3: Suspend / freeze */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">Suspend Orders</p>
              </div>
              {deadItems.length === 0 ? (
                <div className="text-[10px] text-slate-600 italic px-2 py-3 rounded-lg bg-white/3 border border-white/6">
                  No dead stock — no suspensions required
                </div>
              ) : (
                <div className="space-y-1.5">
                  {deadItems.map(item => (
                    <div key={item.sku_id} className="px-2.5 py-2 rounded-lg bg-purple-500/6 border border-purple-500/15">
                      <p className="text-[11px] font-semibold text-white truncate mb-0.5">{item.product_name}</p>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] text-purple-400 font-medium">{formatCurrency(item.inventory_value, true)}</span>
                        <span className="text-[9px] text-slate-500">0 velocity</span>
                      </div>
                      <p className="text-[9px] text-slate-500 mt-0.5">Halt replenishment · coordinate RTV</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Purchasing guidelines + Actions */}
        <div className="px-5 py-3 border-b border-white/5">
          <div className="grid grid-cols-5 gap-4">
            {/* ABC purchasing priority */}
            <div className="col-span-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">ABC Purchasing Priority</p>
              <div className="space-y-1.5">
                {[
                  { cls: "A", rule: "Prioritise review cadence and avoid lead-time stockout", count: metrics.abc_summary.a_count, color: "text-emerald-400", bg: "bg-emerald-500/8", border: "border-emerald-500/15" },
                  { cls: "B", rule: "Standard EOQ-based replenishment cycle", count: metrics.abc_summary.b_count, color: "text-blue-400", bg: "bg-blue-500/6", border: "border-blue-500/10" },
                  { cls: "C", rule: "Minimise — batch orders, consider discontinuing tail items", count: metrics.abc_summary.c_count, color: "text-slate-400", bg: "bg-white/3", border: "border-white/6" },
                ].map(a => (
                  <div key={a.cls} className={`px-3 py-2 rounded-lg border ${a.bg} ${a.border}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-bold ${a.color}`}>{a.cls}</span>
                      <span className="text-[9px] text-slate-500">{a.count} SKUs</span>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-tight">{a.rule}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Budget impact */}
            <div className="col-span-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Budget & Capital Impact</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {[
                  { label: "Estimated recovery", value: formatCurrency(metrics.recoverable_capital, true), color: "text-emerald-400", icon: TrendingUp },
                  { label: "Dead stock holding cost/yr",  value: formatCurrency(metrics.dead_stock_carrying_cost, true), color: "text-red-400", icon: TrendingDown },
                  { label: "Total inventory portfolio",   value: formatCurrency(metrics.total_inventory_value, true), color: "text-white", icon: DollarSign },
                  { label: "Annual holding cost",         value: formatCurrency(metrics.annual_carrying_cost, true), color: "text-orange-400", icon: Zap },
                ].map(m => (
                  <div key={m.label} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/3 border border-white/6">
                    <m.icon className={`w-3 h-3 ${m.color} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] text-slate-500 truncate">{m.label}</p>
                      <p className={`text-xs font-bold ${m.color}`}>{m.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Procurement actions */}
        <div className="px-5 py-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2.5">Procurement Actions Required</p>
          <div className="space-y-2">
            {allActions.map((a, i) => (
              <ActionRow key={i} n={i + 1}
                action={a.action} rationale={a.rationale}
                timeline={a.timeline} impact={a.estimated_impact}
                urgent={a.timeline === "Immediate"} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function InsightsPage() {
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [metrics, setMetrics]           = useState<DashboardMetrics | null>(null);
  const [summary, setSummary]           = useState<ExecutiveSummary | null>(null);
  const [isDemo, setIsDemo]             = useState(true);
  const [generating, setGenerating]     = useState(true);
  const [sourceFile, setSourceFile]     = useState("Inventory dataset");
  const [companyName, setCompanyName]   = useState("");
  const [exporting, setExporting]       = useState(false);
  const [sectionsVisible, setSectionsVisible] = useState(false);
  const [activeAudience, setActiveAudience]   = useState<Audience>("ceo");

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
    let m: DashboardMetrics;
    let fields: string[] = [];
    try {
      const stored = typeof window !== "undefined" && sessionStorage.getItem("supplysense_metrics");
      const fn     = typeof window !== "undefined" && sessionStorage.getItem("supplysense_filename");
      const fl     = typeof window !== "undefined" && sessionStorage.getItem("supplysense_fields");
      if (stored) {
        m = JSON.parse(stored);
        setIsDemo(false);
        if (fn) setSourceFile(fn);
        if (fl) fields = JSON.parse(fl);
      } else { const { metrics: dm } = getDemoData(); m = dm; }
    } catch { const { metrics: dm } = getDemoData(); m = dm; }
    setMetrics(m);

    setSummary(generateExecutiveSummary(m, fields));
    setGenerating(false);
    setSectionsVisible(true);
  }, []);

  if (!metrics || generating) {
    return (
      <div className="flex h-screen bg-[#020617] overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-[#6366f1]/15 border border-[#6366f1]/25 flex items-center justify-center">
              <Brain className="w-7 h-7 text-[#818cf8]" />
            </div>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#6366f1] flex items-center justify-center">
              <RefreshCw className="w-2.5 h-2.5 text-white animate-spin" />
            </span>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white mb-1">Generating briefings…</p>
            <p className="text-xs text-slate-500">Preparing role-specific summaries for {metrics?.total_skus ?? "—"} SKUs</p>
          </div>
          <div className="space-y-2 w-56">
            {["Reading inventory metrics", "Identifying risk patterns", "Calculating financial impact", "Drafting role-specific briefings"].map((step) => (
              <div key={step} className="flex items-center gap-2.5">
                <RefreshCw className="w-3.5 h-3.5 text-[#818cf8] animate-spin flex-shrink-0" />
                <span className="text-xs text-slate-500">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const TABS: { key: Audience; label: string; sub: string }[] = [
    { key: "ceo",           label: "CEO",           sub: "Strategic & Financial" },
    { key: "supply_chain",  label: "Supply Chain",  sub: "Operations Director" },
    { key: "procurement",   label: "Procurement",   sub: "Purchasing Manager" },
  ];

  return (
    <div className="flex h-screen bg-[#020617] overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="nav-glass sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center h-[46px] px-4 gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors">
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Brain className="w-3.5 h-3.5 text-[#818cf8]" />
              <span className="text-xs font-semibold text-white">Insights</span>
              {isDemo && <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20">Demo</span>}
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <button
                disabled={exporting || !summary || !metrics}
                onClick={async () => {
                  if (!summary || !metrics) return;
                  setExporting(true);
                  openHtmlReport(metrics, summary, sourceFile, companyName);
                  setExporting(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 border border-white/8 hover:border-white/16 hover:text-white transition-colors disabled:opacity-50"
              >
                {exporting ? <><RefreshCw className="w-3 h-3 animate-spin" /> Generating…</> : <><FileDown className="w-3 h-3" /> Export</>}
              </button>
              <Link href="/upload"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-medium transition-colors">
                <Upload className="w-3 h-3" /> New upload
              </Link>
            </div>
          </div>
        </header>

        {/* Audience tab bar */}
        <div className="flex-shrink-0 border-b border-white/5 bg-[#020617]/80 backdrop-blur-sm">
          <div className="max-w-[900px] mx-auto px-4 flex items-center gap-1 py-2 overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.key}
                onClick={() => setActiveAudience(tab.key)}
                className={cn(
                  "flex flex-shrink-0 items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all",
                  activeAudience === tab.key
                    ? "bg-[#6366f1] text-white shadow-lg shadow-[#6366f1]/20"
                    : "text-slate-500 hover:text-white hover:bg-white/5"
                )}>
                <span className="font-bold">{tab.label}</span>
                <span className={cn("text-[10px]", activeAudience === tab.key ? "text-indigo-200" : "text-slate-600")}>
                  {tab.sub}
                </span>
              </button>
            ))}
            <div className="ml-auto hidden sm:flex items-center gap-1.5 flex-shrink-0">
              <Target className="w-3 h-3 text-slate-600" />
              <span className="text-[10px] text-slate-600">{metrics.total_skus} SKUs · {new Date(summary.generated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[900px] mx-auto px-4 py-4">
            {activeAudience === "ceo" && (
              <CEOBrief metrics={metrics} summary={summary} visible={sectionsVisible} />
            )}
            {activeAudience === "supply_chain" && (
              <SupplyChainBrief metrics={metrics} summary={summary} visible={sectionsVisible} />
            )}
            {activeAudience === "procurement" && (
              <ProcurementBrief metrics={metrics} summary={summary} visible={sectionsVisible} />
            )}
            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
              <p className="text-[10px] text-slate-600">Generated analysis · Powered by SupplySense</p>
              <Link href="/dashboard" className="inline-flex items-center gap-1 text-[10px] text-[#818cf8] hover:text-white transition-colors">
                Full dashboard <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </main>
      </div>
      <DemoBanner />
    </div>
  );
}

// ── Loading step animation ────────────────────────────────────────────────────




