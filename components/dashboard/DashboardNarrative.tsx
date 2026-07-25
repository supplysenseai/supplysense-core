"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  FileSearch,
  Info,
  Package,
  RotateCcw,
  ShieldCheck,
  TrendingDown,
  Brain,
  type LucideIcon,
} from "lucide-react";
import { KPIInfoTrigger } from "@/components/dashboard/KPIInfoModal";
import { getHealthScoreContributions } from "@/lib/health-score";
import { cn, formatCurrency, getHealthLabel } from "@/lib/utils";
import type { DashboardMetrics } from "@/lib/types";
import type { KPIKey } from "@/lib/kpi-definitions";
import type { ActivePolicy } from "@/lib/policy";

type Tone = "critical" | "warning" | "healthy" | "info" | "neutral";

const toneStyles: Record<Tone, { text: string; bg: string; border: string; icon: string }> = {
  critical: { text: "text-red-300", bg: "bg-red-500/10", border: "border-red-500/20", icon: "text-red-400" },
  warning: { text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: "text-amber-400" },
  healthy: { text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "text-emerald-400" },
  info: { text: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: "text-blue-400" },
  neutral: { text: "text-slate-300", bg: "bg-white/5", border: "border-white/10", icon: "text-slate-400" },
};

function toneForHealth(score: number): Tone {
  if (score >= 80) return "healthy";
  if (score >= 60) return "info";
  if (score >= 40) return "warning";
  return "critical";
}

function actionClasses(tone: Tone) {
  const styles = toneStyles[tone];
  return cn(
    "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
    styles.bg,
    styles.border,
    styles.text,
    "hover:bg-white/10 hover:text-white"
  );
}

function largestHealthPenalty(metrics: DashboardMetrics) {
  return getHealthScoreContributions(metrics)
    .filter((row) => !row.isNeutral)
    .sort((a, b) => a.score - b.score)[0];
}

function policyLabel(activePolicy?: ActivePolicy | null) {
  if (!activePolicy || activePolicy.source === "system") return "System default";
  return activePolicy.source === "file" ? "File-embedded policy" : "Custom policy";
}

export function DashboardSectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export function ExecutiveSituationSummary({ metrics }: { metrics: DashboardMetrics }) {
  const healthLabel = getHealthLabel(metrics.health_score);
  const tone = metrics.critical_stockout_count > 0 ? "critical" : toneForHealth(metrics.health_score);
  const leadingRisk =
    metrics.critical_stockout_count > 0
      ? `${metrics.critical_stockout_count} critical stockout risk${metrics.critical_stockout_count > 1 ? "s" : ""}`
      : `${metrics.stockout_risk_count} stockout risk item${metrics.stockout_risk_count === 1 ? "" : "s"}`;

  return (
    <section className={cn("card border p-5 sm:p-6", toneStyles[tone].bg, toneStyles[tone].border)}>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr] lg:items-center">
        <div>
          <div className={cn("mb-3 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium", toneStyles[tone].border, toneStyles[tone].text)}>
            <ShieldCheck className="h-3.5 w-3.5" />
            Executive situation summary
          </div>
          <h2 className="text-lg font-semibold leading-snug text-white sm:text-xl">
            Inventory Health Score is {metrics.health_score}/100 ({healthLabel}) with {leadingRisk} and {metrics.slow_mover_count} Slow Moving SKU{metrics.slow_mover_count === 1 ? "" : "s"} under review.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
            Estimated Recoverable Capital is {formatCurrency(metrics.recoverable_capital, true)} from policy-based inventory review opportunities.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SummaryStat label="Stockout Risk" value={String(metrics.stockout_risk_count)} tone={metrics.stockout_risk_count > 0 ? "critical" : "healthy"} />
          <SummaryStat label="Slow Moving" value={String(metrics.slow_mover_count)} tone={metrics.slow_mover_count > 0 ? "warning" : "healthy"} />
          <SummaryStat label="Recoverable Capital" value={formatCurrency(metrics.recoverable_capital, true)} tone="healthy" />
          <Link href="/dashboard/insights" className={cn(actionClasses(tone), "min-h-[72px] flex-col items-start justify-center")}>
            <span>Review decision insights</span>
            <span className="text-[10px] text-current/70">Open drill-through</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function SummaryStat({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className={cn("rounded-lg border p-3", toneStyles[tone].bg, toneStyles[tone].border)}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className={cn("mt-1 text-lg font-semibold", toneStyles[tone].text)}>{value}</p>
    </div>
  );
}

export function TodaysPriorities({ metrics }: { metrics: DashboardMetrics }) {
  const penalty = largestHealthPenalty(metrics);
  const priorities = [
    {
      title: "Replenishment priority",
      value: `${metrics.critical_stockout_count} critical`,
      detail: `${metrics.reorder_count} items at or below reorder point`,
      href: "/dashboard/risk",
      action: "Review Replenishment",
      icon: AlertTriangle,
      tone: metrics.critical_stockout_count > 0 ? "critical" : "healthy",
    },
    {
      title: "Slow-moving inventory review",
      value: `${metrics.slow_mover_count} SKUs`,
      detail: `${formatCurrency(metrics.recoverable_capital, true)} Estimated Recoverable Capital`,
      href: "/dashboard/drilldown?chart=health_factor&segment=Slow%20Movers",
      action: "Review Slow Movers",
      icon: RotateCcw,
      tone: metrics.slow_mover_count > 0 ? "warning" : "healthy",
    },
    {
      title: "Turnover improvement",
      value: `${metrics.turnover_ratio}x`,
      detail: "Estimated Inventory Turnover",
      href: "/dashboard/turnover",
      action: "Analyse Turnover",
      icon: BarChart3,
      tone: "info",
    },
    {
      title: "Inventory Health review",
      value: `${metrics.health_score}/100`,
      detail: penalty ? `Largest penalty: ${penalty.label}` : "No material score penalty",
      href: "/dashboard/health-score",
      action: "Review Health Score",
      icon: ShieldCheck,
      tone: toneForHealth(metrics.health_score),
    },
  ] as const;

  return (
    <section className="space-y-3">
      <DashboardSectionHeader
        title="Today's Priorities"
        subtitle="The highest-value decisions to review first, based on the current validated dashboard metrics."
      />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {priorities.map((priority) => {
          const Icon = priority.icon;
          return (
            <div key={priority.title} className="card flex min-h-[174px] flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div className={cn("rounded-lg border p-2", toneStyles[priority.tone].bg, toneStyles[priority.tone].border)}>
                  <Icon className={cn("h-4 w-4", toneStyles[priority.tone].icon)} />
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", toneStyles[priority.tone].bg, toneStyles[priority.tone].text)}>
                  {priority.tone === "critical" ? "Critical" : priority.tone === "warning" ? "Review" : priority.tone === "healthy" ? "Healthy" : "Monitor"}
                </span>
              </div>
              <div className="mt-4 flex-1">
                <p className="text-xs font-medium text-slate-400">{priority.title}</p>
                <p className="mt-1 text-2xl font-semibold text-white">{priority.value}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{priority.detail}</p>
              </div>
              <Link href={priority.href} className={cn(actionClasses(priority.tone), "mt-4 w-full")}>
                {priority.action}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ExecutiveKpiCard({
  title,
  value,
  context,
  icon: Icon,
  tone,
  href,
  action,
  kpiKey,
  metrics,
}: {
  title: string;
  value: string;
  context: string;
  icon: LucideIcon;
  tone: Tone;
  href: string;
  action: string;
  kpiKey?: KPIKey;
  metrics: DashboardMetrics;
}) {
  return (
    <div className="card-elevated relative flex min-h-[184px] flex-col p-4">
      {kpiKey && (
        <div className="absolute right-3 top-3">
          <KPIInfoTrigger kpiKey={kpiKey} metrics={metrics} />
        </div>
      )}
      <div className={cn("mb-4 flex h-9 w-9 items-center justify-center rounded-lg border", toneStyles[tone].bg, toneStyles[tone].border)}>
        <Icon className={cn("h-4 w-4", toneStyles[tone].icon)} />
      </div>
      <p className="pr-8 text-xs font-medium text-slate-400">{title}</p>
      <p className={cn("mt-1 break-words text-2xl font-semibold leading-tight sm:text-3xl", tone === "neutral" ? "text-white" : toneStyles[tone].text)}>
        {value}
      </p>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-500">{context}</p>
      <Link href={href} className={cn(actionClasses(tone), "mt-4")}>{action}</Link>
    </div>
  );
}

export function FinancialImpactCard({ label, value, note, icon: Icon, tone = "neutral" }: { label: string; value: string; note: string; icon: LucideIcon; tone?: Tone }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <p className={cn("mt-2 text-2xl font-semibold", tone === "neutral" ? "text-white" : toneStyles[tone].text)}>{value}</p>
        </div>
        <div className={cn("rounded-lg border p-2", toneStyles[tone].bg, toneStyles[tone].border)}>
          <Icon className={cn("h-4 w-4", toneStyles[tone].icon)} />
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">{note}</p>
    </div>
  );
}

export function AiDecisionBrief({ metrics }: { metrics: DashboardMetrics }) {
  const healthLabel = getHealthLabel(metrics.health_score);
  const priorities = [
    metrics.critical_stockout_count > 0
      ? `Priority 1: Review ${metrics.critical_stockout_count} critical stockout risk${metrics.critical_stockout_count > 1 ? "s" : ""} before broader optimisation work.`
      : "Priority 1: Maintain replenishment monitoring; no critical stockout risk is currently flagged.",
    metrics.recoverable_capital > 0
      ? `Priority 2: Review Slow Moving and Dead Stock opportunities tied to ${formatCurrency(metrics.recoverable_capital, true)} Estimated Recoverable Capital.`
      : "Priority 2: Continue ageing and slow-mover review; no recoverable capital estimate is currently flagged.",
    `Priority 3: Use turnover analytics to validate the ${metrics.turnover_ratio}x Estimated Inventory Turnover position.`,
  ];

  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-2">
          <Brain className="h-4 w-4 text-blue-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">AI Decision Brief</h2>
          <p className="text-xs text-slate-500">Rule-based deterministic summary from current dashboard metrics</p>
        </div>
      </div>
      <p className="max-w-4xl text-sm leading-relaxed text-slate-300">
        Inventory Health Score is {metrics.health_score}/100 ({healthLabel}). The immediate operating focus is {metrics.critical_stockout_count > 0 ? "stockout-risk review" : "continued replenishment monitoring"}, while {metrics.slow_mover_count} Slow Moving SKU{metrics.slow_mover_count === 1 ? "" : "s"} and {metrics.dead_stock_count} Dead Stock SKU{metrics.dead_stock_count === 1 ? "" : "s"} define the main working-capital review.
      </p>
      <div className="mt-4 grid gap-2">
        {priorities.map((priority) => (
          <div key={priority} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-slate-400">
            {priority}
          </div>
        ))}
      </div>
    </section>
  );
}

export function AnalysisMetadata({
  metrics,
  filename,
  rowCount,
  isDemo,
  activePolicy,
  displayDate,
  completenessScore,
}: {
  metrics: DashboardMetrics;
  filename: string;
  rowCount: number;
  isDemo: boolean;
  activePolicy: ActivePolicy | null;
  displayDate: Date;
  completenessScore: number;
}) {
  const policyName = policyLabel(activePolicy ?? metrics.active_policy);
  const items = [
    { label: "Records analysed", value: rowCount > 0 ? rowCount.toLocaleString() : metrics.total_skus.toLocaleString(), icon: FileSearch },
    { label: "Active policy", value: policyName, icon: ShieldCheck },
    { label: "Analysis date", value: displayDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), icon: Clock },
    { label: "Demo Mode", value: isDemo ? "Enabled" : "Disabled", icon: Info },
    { label: "Data completeness", value: `${completenessScore}%`, icon: CheckCircle2 },
    { label: "Last refresh", value: isDemo ? "Demo snapshot" : filename || "Current session", icon: RotateCcw },
  ];

  return (
    <section className="card p-5">
      <DashboardSectionHeader title="Analysis Metadata" subtitle="Current dashboard context and analysis provenance." />
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-lg border border-white/8 bg-white/[0.03] p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                <Icon className="h-3.5 w-3.5 text-slate-500" />
                {item.label}
              </div>
              <p className="mt-2 truncate text-sm font-medium text-slate-200">{item.value}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function ExecutiveKpiGrid({ metrics }: { metrics: DashboardMetrics }) {
  const cards: Array<{
    title: string;
    value: string;
    context: string;
    icon: LucideIcon;
    tone: Tone;
    href: string;
    action: string;
    kpiKey: KPIKey;
  }> = [
    {
      title: "Inventory Health Score",
      value: `${metrics.health_score}/100`,
      context: `${getHealthLabel(metrics.health_score)} inventory position based on the current policy.`,
      icon: ShieldCheck,
      tone: toneForHealth(metrics.health_score),
      href: "/dashboard/health-score",
      action: "Review Health Score",
      kpiKey: "health_score" as KPIKey,
    },
    {
      title: "Stockout Risk",
      value: String(metrics.stockout_risk_count),
      context: `${metrics.critical_stockout_count} critical risk${metrics.critical_stockout_count === 1 ? "" : "s"} requiring replenishment review.`,
      icon: AlertTriangle,
      tone: metrics.stockout_risk_count > 0 ? "critical" : "healthy",
      href: "/dashboard/risk",
      action: "Review Replenishment",
      kpiKey: "stockout_risk" as KPIKey,
    },
    {
      title: "Estimated Recoverable Capital",
      value: formatCurrency(metrics.recoverable_capital, true),
      context: "Policy-based estimate from Slow Moving and Dead Stock review opportunities.",
      icon: CircleDollarSign,
      tone: "healthy",
      href: "/dashboard/financial-impact",
      action: "Review Impact",
      kpiKey: "recoverable_capital" as KPIKey,
    },
    {
      title: "Estimated Inventory Turnover",
      value: `${metrics.turnover_ratio}x`,
      context: "Snapshot estimate based on annualised consumption and inventory value.",
      icon: BarChart3,
      tone: "info",
      href: "/dashboard/turnover",
      action: "Analyse Turnover",
      kpiKey: "turnover_ratio" as KPIKey,
    },
    {
      title: "Slow Moving",
      value: String(metrics.slow_mover_count),
      context: `${formatCurrency(metrics.slow_mover_value, true)} currently classified as Slow Moving.`,
      icon: RotateCcw,
      tone: metrics.slow_mover_count > 0 ? "warning" : "healthy",
      href: "/dashboard/drilldown?chart=health_factor&segment=Slow%20Movers",
      action: "Review Slow Movers",
      kpiKey: "slow_moving" as KPIKey,
    },
    {
      title: "Dead Stock",
      value: String(metrics.dead_stock_count),
      context: `${formatCurrency(metrics.dead_stock_value, true)} currently classified as Dead Stock.`,
      icon: TrendingDown,
      tone: metrics.dead_stock_count > 0 ? "critical" : "healthy",
      href: "/dashboard/drilldown?chart=health_factor&segment=Dead%20Stock",
      action: "Review Dead Stock",
      kpiKey: "dead_stock" as KPIKey,
    },
  ];

  return (
    <section className="space-y-3">
      <DashboardSectionHeader title="Key KPIs" subtitle="Executive KPI set focused on risk, working capital, turnover, and health." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <ExecutiveKpiCard key={card.title} {...card} metrics={metrics} />
        ))}
      </div>
    </section>
  );
}

export function FinancialImpact({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <section className="space-y-3">
      <DashboardSectionHeader
        title="Business and Financial Impact"
        subtitle="Financial translation of the current inventory snapshot using existing validated calculations."
        action={<Link href="/dashboard/financial-impact" className={actionClasses("info")}>Open financial analysis</Link>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FinancialImpactCard label="Current Inventory Value" value={formatCurrency(metrics.total_inventory_value, true)} note={`${metrics.total_skus} SKUs in the current analysis snapshot.`} icon={Package} />
        <FinancialImpactCard label="Estimated Recoverable Capital" value={formatCurrency(metrics.recoverable_capital, true)} note="Policy-based snapshot estimate; not guaranteed recovery." icon={CircleDollarSign} tone="healthy" />
        <FinancialImpactCard label="Annual Carrying Cost" value={formatCurrency(metrics.annual_carrying_cost, true)} note="Estimated annual carrying cost from current inventory value." icon={TrendingDown} tone="warning" />
        <FinancialImpactCard label="Annual Consumption Value" value={formatCurrency(metrics.annualised_consumption_cost ?? 0, true)} note="Annualised Consumption Cost where available in the current metrics." icon={BarChart3} tone="info" />
      </div>
    </section>
  );
}

function averageInventoryAge(metrics: DashboardMetrics) {
  const aging = metrics.aging_metrics;
  if (aging?.has_ageing_data) return `${aging.avg_ageing_days}d`;
  if (metrics.estimated_days_inventory != null) return `${Math.round(metrics.estimated_days_inventory)}d`;
  return "N/A";
}

function compactPolicyLabel(activePolicy?: ActivePolicy | null) {
  return policyLabel(activePolicy);
}

function compactStatus(tone: Tone, label: string) {
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", toneStyles[tone].bg, toneStyles[tone].border, toneStyles[tone].text)}>
      {label}
    </span>
  );
}

export function ControlTowerHeader({
  metrics,
  rowCount,
  isDemo,
  activePolicy,
  displayDate,
}: {
  metrics: DashboardMetrics;
  rowCount: number;
  isDemo: boolean;
  activePolicy: ActivePolicy | null;
  displayDate: Date;
}) {
  const dateLabel = isDemo
    ? "Demo snapshot: 30 Jun 2026"
    : displayDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-white">Event2Act AI</h1>
        <p className="mt-1 text-sm text-slate-400">
          Inventory Intelligence for performance, operational risk, working capital and business decisions.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {dateLabel} | {(rowCount || metrics.total_skus).toLocaleString()} records analysed | {compactPolicyLabel(activePolicy ?? metrics.active_policy)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/dashboard/insights" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white">
          Insights
        </Link>
        <Link href="/dashboard/reports" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white">
          Export
        </Link>
        <Link href="/dashboard/validation" className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white">
          Explainability
        </Link>
      </div>
    </header>
  );
}

export function ExecutiveCommandBar({ metrics }: { metrics: DashboardMetrics }) {
  const cells: Array<{ label: string; value: string; context: string; href: string; icon: LucideIcon; tone: Tone; kpiKey: KPIKey }> = [
    { label: "Health Score", value: `${metrics.health_score}/100`, context: getHealthLabel(metrics.health_score), href: "/dashboard/health-score", icon: ShieldCheck, tone: toneForHealth(metrics.health_score), kpiKey: "health_score" },
    { label: "Critical Risks", value: String(metrics.critical_stockout_count), context: "Stockout exposure", href: "/dashboard/risk", icon: AlertTriangle, tone: metrics.critical_stockout_count > 0 ? "critical" : "healthy", kpiKey: "stockout_risk" },
    { label: "Recoverable Capital", value: formatCurrency(metrics.recoverable_capital, true), context: "Estimated, policy-based", href: "/dashboard/financial-impact", icon: CircleDollarSign, tone: "healthy", kpiKey: "recoverable_capital" },
    { label: "Inventory Value", value: formatCurrency(metrics.total_inventory_value, true), context: "Current snapshot", href: "/dashboard/financial-impact", icon: Package, tone: "neutral", kpiKey: "inventory_value" },
    { label: "Inventory Turnover", value: `${metrics.turnover_ratio}x`, context: "Estimated performance", href: "/dashboard/turnover", icon: BarChart3, tone: "info", kpiKey: "turnover_ratio" },
    { label: "Average Age", value: averageInventoryAge(metrics), context: metrics.aging_metrics?.has_ageing_data ? "Inventory age" : "Ageing data unavailable", href: "/dashboard/turnover", icon: Clock, tone: metrics.aging_metrics?.has_ageing_data ? "warning" : "neutral", kpiKey: "avg_ageing_days" },
  ];
  return (
    <nav aria-label="Executive command metrics" className="ss-command-bar grid grid-cols-1 overflow-hidden sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      {cells.map((cell) => {
        const Icon = cell.icon;
        return (
          <div key={cell.label} className="group flex min-h-[92px] items-center gap-3 border-b border-white/8 px-4 py-3 transition-colors hover:bg-white/[0.04] sm:border-r 2xl:border-b-0">
            <Icon className={cn("h-4 w-4 flex-shrink-0", toneStyles[cell.tone].icon)} />
            <Link href={cell.href} className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium uppercase leading-tight tracking-wider text-slate-500">{cell.label}</span>
              <span className="mt-0.5 block truncate text-lg font-semibold leading-tight text-white">{cell.value}</span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">{cell.context}</span>
            </Link>
            <div className="shrink-0 opacity-80 transition-opacity group-hover:opacity-100" aria-label={`${cell.label} formula and evidence`}>
              <KPIInfoTrigger kpiKey={cell.kpiKey} metrics={metrics} />
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export function ControlTowerPriorities({ metrics }: { metrics: DashboardMetrics }) {
  const penalty = largestHealthPenalty(metrics);
  const rows = [
    { rank: "01", action: "Replenishment review", value: `${metrics.critical_stockout_count} critical SKUs`, status: metrics.critical_stockout_count > 0 ? "Immediate" : "Stable", href: "/dashboard/risk", tone: metrics.critical_stockout_count > 0 ? "critical" : "healthy" },
    { rank: "02", action: "Slow Moving working-capital review", value: formatCurrency(metrics.recoverable_capital, true), status: metrics.recoverable_capital > 0 ? "Review" : "Monitor", href: "/dashboard/drilldown?chart=health_factor&segment=Slow%20Movers", tone: metrics.recoverable_capital > 0 ? "warning" : "healthy" },
    { rank: "03", action: "Inventory turnover review", value: `${metrics.turnover_ratio}x turnover`, status: "Analyse", href: "/dashboard/turnover", tone: "info" },
    { rank: "04", action: "Inventory Health review", value: penalty ? penalty.label : `${metrics.health_score}/100`, status: getHealthLabel(metrics.health_score), href: "/dashboard/health-score", tone: toneForHealth(metrics.health_score) },
  ] as const;
  return (
    <section className="ss-panel p-4">
      <h2 className="text-sm font-semibold text-white">Today's Priorities</h2>
      <div className="mt-3 divide-y divide-white/8">
        {rows.map((row) => (
          <div key={row.rank} className="grid grid-cols-[34px_1fr] gap-3 py-3 sm:grid-cols-[34px_1fr_auto_auto] sm:items-center">
            <span className="font-mono text-xs text-slate-500">{row.rank}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{row.action}</p>
              <p className="truncate text-xs text-slate-500">{row.value}</p>
            </div>
            <div className="mt-2 sm:mt-0">{compactStatus(row.tone, row.status)}</div>
            <Link href={row.href} className="mt-2 text-xs font-medium text-blue-300 hover:text-white sm:mt-0">Review →</Link>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ControlTowerDecisionBrief({ metrics }: { metrics: DashboardMetrics }) {
  const hasCritical = metrics.critical_stockout_count > 0;
  const heading = hasCritical ? "Protect availability before optimising capital" : "Shift attention toward capital and performance optimisation";
  const recommendation = hasCritical ? "Start with replenishment risk review, then move to working-capital recovery." : "Prioritise working-capital review and turnover performance.";
  const impactItems = hasCritical
    ? ["Critical replenishment risks remain exposed.", "Working capital stays tied up in review opportunities.", "Carrying costs continue against the current inventory base."]
    : ["Working capital remains tied up without review.", "Turnover improvement opportunities may be delayed.", "Carrying costs continue against the current inventory base."];
  return (
    <section className="ss-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Decision Brief</h2>
          <p className="mt-1 text-xs font-medium text-slate-300">{heading}</p>
        </div>
        {compactStatus(hasCritical ? "critical" : toneForHealth(metrics.health_score), getHealthLabel(metrics.health_score))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">
        {hasCritical ? "Availability risk should lead today's operating agenda." : "The current position supports a more deliberate efficiency review."} Working-capital opportunity and carrying cost should be assessed after the highest-priority operational risk is understood.
      </p>
      <div className="mt-4 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Primary recommendation</p>
        <p className="mt-1 text-sm text-white">{recommendation}</p>
      </div>
      <div className="mt-3 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Business Impact</p>
        <p className="mt-1 text-xs text-slate-500">If no action is taken today:</p>
        <ul className="mt-2 space-y-1.5">
          {impactItems.map((item) => (
            <li key={item} className="flex gap-2 text-xs text-slate-400">
              <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-slate-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <Link href={hasCritical ? "/dashboard/risk" : "/dashboard/insights"} className="mt-4 inline-flex rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-white/5 hover:text-white">
        {hasCritical ? "Investigate risk →" : "Review insights →"}
      </Link>
    </section>
  );
}

function MiniBar({ value, tone }: { value: number; tone: Tone }) {
  const fill = tone === "healthy" ? "bg-emerald-500" : tone === "warning" ? "bg-amber-500" : tone === "critical" ? "bg-red-500" : tone === "info" ? "bg-blue-500" : "bg-slate-500";
  return <div className="h-2 rounded-full bg-white/8"><div className={cn("h-full rounded-full", fill)} style={{ width: `${Math.max(4, Math.min(100, value))}%` }} /></div>;
}

export function CompactIntelligenceGrid({ metrics, completenessScore }: { metrics: DashboardMetrics; completenessScore: number }) {
  const aging = metrics.aging_metrics;
  const riskTotal = Object.values(metrics.risk_distribution).reduce((sum, v) => sum + v, 0) || 1;
  const abc = metrics.abc_summary;
  const widgets = [
    {
      title: "Inventory Health",
      body: `${metrics.health_score}/100 | ${getHealthLabel(metrics.health_score)}`,
      detail: "Overall policy-based inventory condition.",
      href: "/dashboard/health-score",
      action: "Review",
      content: <MiniBar value={metrics.health_score} tone={toneForHealth(metrics.health_score)} />,
    },
    {
      title: "Risk Distribution",
      body: `${metrics.critical_stockout_count} critical`,
      detail: "Critical count drives immediate replenishment review.",
      href: "/dashboard/risk",
      action: "Investigate",
      content: (
        <div className="flex h-2 overflow-hidden rounded-full bg-white/8">
          {[
            ["bg-emerald-500", metrics.risk_distribution.low],
            ["bg-blue-500", metrics.risk_distribution.watch],
            ["bg-amber-500", metrics.risk_distribution.elevated],
            ["bg-red-500", metrics.risk_distribution.critical],
            ["bg-slate-500", metrics.risk_distribution.dead],
          ].map(([klass, count], index) => <span key={index} className={klass as string} style={{ width: `${((count as number) / riskTotal) * 100}%` }} />)}
        </div>
      ),
    },
    {
      title: "ABC Profile",
      body: `A ${abc.a_count} | B ${abc.b_count} | C ${abc.c_count}`,
      detail: `A-items drive ${abc.a_revenue_pct}% Annual Consumption Value.`,
      href: "/dashboard/abc-analysis",
      action: "Review",
      content: (
        <div className="flex h-2 overflow-hidden rounded-full bg-white/8">
          <span className="bg-blue-400" style={{ width: `${(abc.a_count / metrics.total_skus) * 100}%` }} />
          <span className="bg-sky-500" style={{ width: `${(abc.b_count / metrics.total_skus) * 100}%` }} />
          <span className="bg-emerald-500" style={{ width: `${(abc.c_count / metrics.total_skus) * 100}%` }} />
        </div>
      ),
    },
    {
      title: "Average Inventory Age",
      body: averageInventoryAge(metrics),
      detail: aging?.has_ageing_data ? `Age distribution available across ${aging.buckets.length} movement buckets.` : "Movement history required for ageing detail.",
      href: "/dashboard/turnover",
      action: "Optimise",
      content: <MiniBar value={aging?.has_ageing_data ? Math.min(100, (aging.avg_ageing_days / 365) * 100) : 12} tone={aging?.has_ageing_data ? "warning" : "neutral"} />,
    },
    {
      title: "Financial Snapshot",
      body: formatCurrency(metrics.total_inventory_value, true),
      detail: `${formatCurrency(metrics.recoverable_capital, true)} estimated recoverable | ${formatCurrency(metrics.annual_carrying_cost, true)} annual carrying cost.`,
      href: "/dashboard/financial-impact",
      action: "Optimise",
      content: <MiniBar value={metrics.total_inventory_value ? (metrics.recoverable_capital / metrics.total_inventory_value) * 100 : 0} tone="healthy" />,
    },
    {
      title: "Analysis Confidence",
      body: "Calculations Verified",
      detail: `Explainability available · Data completeness ${completenessScore}% · ${compactPolicyLabel(metrics.active_policy)} · Reconciled results.`,
      href: "/dashboard/validation",
      action: "Validate",
      content: <MiniBar value={completenessScore} tone={completenessScore >= 80 ? "healthy" : completenessScore >= 60 ? "warning" : "critical"} />,
    },
  ];

  return (
    <section className="space-y-3">
      <DashboardSectionHeader title="Inventory Intelligence Overview" subtitle="Six focused signals for risk, capital, performance, ageing and trust." />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {widgets.map((widget) => (
          <Link key={widget.title} href={widget.href} className="ss-panel flex min-h-[146px] flex-col p-4 transition-colors hover:bg-white/[0.04]">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">{widget.title}</h3>
              <span className="text-xs text-blue-300">{widget.action} →</span>
            </div>
            <p className="mt-3 text-xl font-semibold text-white">{widget.body}</p>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">{widget.detail}</p>
            <div className="mt-3">{widget.content}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function QuickNavigation() {
  const links = [
    ["Health Score", "/dashboard/health-score"],
    ["Risk Heatmap", "/dashboard/risk-heatmap"],
    ["ABC Analysis", "/dashboard/abc-analysis"],
    ["Turnover", "/dashboard/turnover"],
    ["Validation", "/dashboard/validation"],
    ["Insights", "/dashboard/insights"],
    ["Policy", "/settings"],
    ["Reports", "/dashboard/reports"],
  ];
  return (
    <nav aria-label="Quick navigation" className="ss-panel flex flex-wrap items-center gap-2 p-3">
      <span className="mr-1 text-xs font-medium uppercase tracking-wider text-slate-500">Quick navigation</span>
      {links.map(([label, href]) => (
        <Link key={label} href={href} className="rounded-md border border-white/8 px-2.5 py-1 text-xs text-slate-300 hover:bg-white/5 hover:text-white">
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function ThinMetadataFooter({
  metrics,
  rowCount,
  isDemo,
  activePolicy,
  completenessScore,
}: {
  metrics: DashboardMetrics;
  rowCount: number;
  isDemo: boolean;
  activePolicy: ActivePolicy | null;
  completenessScore: number;
}) {
  return (
    <footer className="pb-2 text-xs text-slate-500">
      {(rowCount || metrics.total_skus).toLocaleString()} records analysed | {compactPolicyLabel(activePolicy ?? metrics.active_policy)} | {isDemo ? "Demo snapshot: 30 Jun 2026" : "Current session analysis"} | Data completeness: {completenessScore}% | Calculation status: explainable
    </footer>
  );
}
