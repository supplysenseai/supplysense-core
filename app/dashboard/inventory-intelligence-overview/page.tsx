"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock,
  Factory,
  Menu,
  Package,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  TrendingDown,
  Upload,
  UserCircle,
  X,
  type LucideIcon,
} from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { clearStoredDashboardMetrics, readStoredDashboardMetrics } from "@/lib/dashboard-storage";
import { clearSession, isDemoMode } from "@/lib/demo-loader";
import { DEMO_ANALYSIS_DATE } from "@/lib/demo-data";
import { computeCompleteness } from "@/lib/data-completeness";
import type { DashboardMetrics } from "@/lib/types";
import type { ActivePolicy } from "@/lib/policy";
import { clearAuth, getAuth } from "@/lib/auth";
import { cn, formatCurrency, getHealthLabel } from "@/lib/utils";

type Persona = "ceo" | "operations" | "procurement";
type Tone = "critical" | "warning" | "healthy" | "info" | "neutral";

const toneStyles: Record<Tone, { text: string; bg: string; border: string; icon: string }> = {
  critical: { text: "text-red-300", bg: "bg-red-500/10", border: "border-red-500/20", icon: "text-red-400" },
  warning: { text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: "text-amber-400" },
  healthy: { text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "text-emerald-400" },
  info: { text: "text-blue-300", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: "text-blue-400" },
  neutral: { text: "text-slate-300", bg: "bg-white/5", border: "border-white/10", icon: "text-slate-400" },
};

const PERSONAS: Array<{ key: Persona; label: string; sub: string; question: string; icon: LucideIcon }> = [
  { key: "ceo", label: "CEO", sub: "Executive decisions", question: "What business decisions require my attention?", icon: BriefcaseBusiness },
  { key: "operations", label: "Supply Chain Director", sub: "Operations command", question: "What operational priorities require action?", icon: Factory },
  { key: "procurement", label: "Procurement Manager", sub: "Purchasing workbench", question: "What should my team buy or stop buying today?", icon: ShoppingCart },
];

function healthTone(score: number): Tone {
  if (score >= 80) return "healthy";
  if (score >= 60) return "info";
  if (score >= 40) return "warning";
  return "critical";
}

function averageInventoryAge(metrics: DashboardMetrics) {
  const aging = metrics.aging_metrics;
  if (aging?.has_ageing_data) return `${aging.avg_ageing_days} days`;
  if (metrics.estimated_days_inventory != null) return `${Math.round(metrics.estimated_days_inventory)} days`;
  return "Unavailable";
}

function MetricTile({ label, value, note, icon: Icon, tone }: { label: string; value: string; note: string; icon: LucideIcon; tone: Tone }) {
  return (
    <div className="ss-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className={cn("mt-2 truncate text-2xl font-semibold", toneStyles[tone].text)}>{value}</p>
        </div>
        <div className={cn("rounded-lg border p-2", toneStyles[tone].bg, toneStyles[tone].border)}>
          <Icon className={cn("h-4 w-4", toneStyles[tone].icon)} />
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">{note}</p>
    </div>
  );
}

function ActionCard({
  title,
  issue,
  impact,
  action,
  outcome,
  timeline,
  priority,
  tone,
  icon: Icon,
}: {
  title: string;
  issue: string;
  impact: string;
  action: string;
  outcome: string;
  timeline: string;
  priority: string;
  tone: Tone;
  icon: LucideIcon;
}) {
  return (
    <article className="ss-panel flex min-h-[280px] flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className={cn("rounded-lg border p-2", toneStyles[tone].bg, toneStyles[tone].border)}>
          <Icon className={cn("h-4 w-4", toneStyles[tone].icon)} />
        </div>
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", toneStyles[tone].bg, toneStyles[tone].border, toneStyles[tone].text)}>
          {priority}
        </span>
      </div>
      <h3 className="mt-4 text-sm font-semibold text-white">{title}</h3>
      <div className="mt-4 grid gap-3 text-xs leading-relaxed">
        <p><span className="font-medium text-slate-300">Issue:</span> <span className="text-slate-500">{issue}</span></p>
        <p><span className="font-medium text-slate-300">Business Impact:</span> <span className="text-slate-500">{impact}</span></p>
        <p><span className="font-medium text-slate-300">Suggested Action:</span> <span className="text-slate-500">{action}</span></p>
        <p><span className="font-medium text-slate-300">Expected Outcome:</span> <span className="text-slate-500">{outcome}</span></p>
      </div>
      <div className="mt-auto pt-4">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-400">
          <Clock className="h-3 w-3 text-slate-500" />
          {timeline}
        </span>
      </div>
    </article>
  );
}

function PersonaBrief({ persona, metrics }: { persona: Persona; metrics: DashboardMetrics }) {
  const hasCritical = metrics.critical_stockout_count > 0;
  const capital = formatCurrency(metrics.recoverable_capital, true);
  const health = `${metrics.health_score}/100`;
  const turnover = `${metrics.turnover_ratio}x`;

  const content = {
    ceo: {
      eyebrow: "AI Executive Brief",
      title: hasCritical ? "Revenue continuity and capital discipline require executive attention." : "The business position supports a capital-efficiency review.",
      body: `Event2Act identifies ${hasCritical ? `${metrics.critical_stockout_count} Revenue Continuity Risk item${metrics.critical_stockout_count === 1 ? "" : "s"}` : "no immediate revenue-continuity breach"} alongside ${capital} in policy-based recoverable capital. Inventory Health is ${health} (${getHealthLabel(metrics.health_score)}), and turnover is estimated at ${turnover}. The executive agenda should balance business-risk protection with disciplined release of idle capital.`,
      tone: hasCritical ? "critical" : healthTone(metrics.health_score),
      icon: BriefcaseBusiness,
    },
    operations: {
      eyebrow: "AI Operations Command Centre",
      title: hasCritical ? "Supply continuity should lead today's operating cadence." : "Operational focus can shift toward balance and throughput.",
      body: `The current operating picture shows ${metrics.stockout_risk_count} risk item${metrics.stockout_risk_count === 1 ? "" : "s"}, ${metrics.slow_mover_count} capital-efficiency SKU${metrics.slow_mover_count === 1 ? "" : "s"}, and an Inventory Health position of ${health}. Priorities should protect service level, reduce bottlenecks, and keep warehouse capacity aligned with demand signals.`,
      tone: hasCritical ? "critical" : "info",
      icon: Factory,
    },
    procurement: {
      eyebrow: "AI Purchasing Workbench",
      title: metrics.reorder_count > 0 ? "Today's buying queue should start with replenishment exposure." : "Purchasing can focus on verification and hold decisions.",
      body: `Event2Act flags ${metrics.reorder_count} reorder recommendation${metrics.reorder_count === 1 ? "" : "s"} and ${metrics.critical_stockout_count} critical supply-continuity risk${metrics.critical_stockout_count === 1 ? "" : "s"}. Procurement should sequence buys by urgency, ABC importance, lead-time exposure and budget impact while holding purchases tied to idle capital where policy allows.`,
      tone: metrics.reorder_count > 0 ? "warning" : "healthy",
      icon: ShoppingCart,
    },
  }[persona];
  const Icon = content.icon;

  return (
    <section className={cn("rounded-2xl border p-5 sm:p-6", toneStyles[content.tone as Tone].bg, toneStyles[content.tone as Tone].border)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-4xl">
          <div className={cn("mb-3 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium", toneStyles[content.tone as Tone].border, toneStyles[content.tone as Tone].text)}>
            <Icon className="h-3.5 w-3.5" />
            {content.eyebrow}
          </div>
          <h1 className="text-xl font-semibold leading-tight text-white sm:text-2xl">{content.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{content.body}</p>
        </div>
        <div className="grid min-w-[260px] grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/8 bg-[#020617]/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Health</p>
            <p className="mt-1 text-lg font-semibold text-white">{health}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-[#020617]/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Capital</p>
            <p className="mt-1 text-lg font-semibold text-emerald-300">{capital}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function InventoryIntelligenceOverviewPage() {
  const router = useRouter();
  const [activePersona, setActivePersona] = useState<Persona>("ceo");
  const [authUser, setAuthUser] = useState<{ name: string; email: string; plan: string } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [filename, setFilename] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [isDemo, setIsDemo] = useState(false);
  const [noData, setNoData] = useState(false);
  const [detectedFields, setDetectedFields] = useState<string[]>([]);
  const [activePolicy, setActivePolicy] = useState<ActivePolicy | null>(null);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    const auth = getAuth();
    if (auth) setAuthUser({ name: auth.name, email: auth.email, plan: auth.plan });
  }, []);

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
    if (typeof window === "undefined") return;
    try {
      const parsedMetrics = readStoredDashboardMetrics({ validateVersion: true });
      const storedFn = sessionStorage.getItem("supplysense_filename");
      const storedRw = sessionStorage.getItem("supplysense_rows");
      const storedFl = sessionStorage.getItem("supplysense_fields");
      if (parsedMetrics) {
        setMetrics(parsedMetrics);
        setFilename(storedFn ?? "Uploaded file");
        setRowCount(parseInt(storedRw ?? "0", 10));
        setIsDemo(isDemoMode());
        setDetectedFields(storedFl ? JSON.parse(storedFl) : []);
        if (parsedMetrics.active_policy) {
          setActivePolicy(parsedMetrics.active_policy);
        } else {
          const storedPolicy = sessionStorage.getItem("supplysense_policy");
          if (storedPolicy) {
            try { setActivePolicy(JSON.parse(storedPolicy)); } catch { /* ignore */ }
          }
        }
        return;
      }
    } catch { clearStoredDashboardMetrics(); }
    setNoData(true);
  }, []);

  if (noData) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617] px-4">
        <div className="card p-8 max-w-md w-full text-center space-y-5">
          <div>
            <h2 className="text-base font-bold text-white mb-1.5" style={{ fontFamily: "Syne, sans-serif" }}>No data loaded yet</h2>
            <p className="text-xs text-slate-500 leading-relaxed">Upload your inventory file before opening Inventory Intelligence Overview.</p>
          </div>
          <Link href="/upload" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-medium transition-colors">
            <Upload className="w-3.5 h-3.5" />
            Upload your inventory
          </Link>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617]">
        <div className="card px-6 py-5 flex flex-col items-center gap-3 min-w-64">
          <RefreshCw className="w-6 h-6 text-[#818cf8] animate-spin" />
          <span className="text-sm text-slate-400">Loading overview...</span>
          <span className="text-[11px] text-slate-600">Preparing analyst workspace</span>
        </div>
      </div>
    );
  }

  const completeness = computeCompleteness(detectedFields);
  const displayDate = new Date(isDemo ? DEMO_ANALYSIS_DATE : Date.now());

  return (
    <div className="flex h-screen bg-[#020617] ss-page overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="nav-glass sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center h-[46px] px-4 gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
              {companyName && (
                <span className="text-xs font-semibold text-white truncate leading-tight">{companyName}</span>
              )}
              <span className="text-[11px] text-slate-500 truncate">
                {isDemo ? "Demo dataset" : filename} | {metrics.total_skus} SKUs |{" "}
                {displayDate.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {isDemo && (
                <div className="hidden sm:flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Demo mode
                  </span>
                  <Link href="/upload"
                    onClick={() => { try { clearSession(); } catch {} }}
                    className="text-[10px] text-slate-500 hover:text-white transition-colors underline underline-offset-2">
                    Upload real data →
                  </Link>
                </div>
              )}
              <Link
                href="/upload"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-medium transition-colors"
              >
                <Upload className="w-3 h-3" />
                New upload
              </Link>
              <div className="hidden sm:block">
                <ThemeSwitcher variant="compact" />
              </div>

              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="w-7 h-7 rounded-full bg-[#6366f1]/20 flex items-center justify-center text-[#818cf8] hover:bg-[#6366f1]/30 transition-colors"
                >
                  <UserCircle className="w-5 h-5" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-9 w-52 bg-[#0f172a] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5">
                      <p className="text-xs font-semibold text-white truncate">{authUser?.name || "Guest"}</p>
                      <p className="text-[11px] text-slate-500 truncate">{authUser?.email}</p>
                      {authUser && (
                        <span className="mt-1.5 inline-block text-[10px] font-medium bg-brand-500/15 text-brand-400 px-2 py-0.5 rounded-full">
                          Local access
                        </span>
                      )}
                    </div>
                    <div className="p-1">
                      <button
                        onClick={() => { clearAuth(); router.push("/login"); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1280px] mx-auto px-4 pt-5 pb-28 sm:pt-6 sm:pb-32 space-y-5 sm:space-y-6">
            <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-brand-300">Inventory Intelligence Overview</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">AI decision assistants by role</h1>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
                  The same validated inventory metrics are translated into role-specific decisions for executive, operations and procurement teams.
                </p>
              </div>
              <div className="text-xs text-slate-600">
                {(rowCount || metrics.total_skus).toLocaleString()} records | Data completeness {completeness.score}%
              </div>
            </section>

            <nav aria-label="Persona views" className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {PERSONAS.map((persona) => {
                const Icon = persona.icon;
                const active = activePersona === persona.key;
                return (
                  <button
                    key={persona.key}
                    type="button"
                    onClick={() => setActivePersona(persona.key)}
                    className={cn(
                      "ss-panel flex items-start gap-3 p-4 text-left transition-colors",
                      active ? "border-[#6366f1]/40 bg-[#6366f1]/10" : "hover:bg-white/[0.04]"
                    )}
                  >
                    <span className={cn("rounded-lg border p-2", active ? "border-[#6366f1]/30 bg-[#6366f1]/15" : "border-white/8 bg-white/[0.03]")}>
                      <Icon className={cn("h-4 w-4", active ? "text-[#818cf8]" : "text-slate-500")} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-white">{persona.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{persona.sub}</span>
                      <span className={cn("mt-2 block text-[11px] leading-relaxed", active ? "text-slate-300" : "text-slate-600")}>
                        {persona.question}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>

            <PersonaExperience persona={activePersona} metrics={metrics} completenessScore={completeness.score} />

            <footer className="pb-2 text-xs text-slate-500">
              {(rowCount || metrics.total_skus).toLocaleString()} records analysed | {isDemo ? "Demo snapshot: 30 Jun 2026" : "Current session analysis"} | Data completeness: {completeness.score}% | Calculation status: explainable
            </footer>
            {activePolicy && (
              <p className="sr-only">
                Active policy source: {activePolicy.source}
              </p>
            )}
            <span className="sr-only">
              {displayDate.toISOString()}
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}

function PersonaExperience({ persona, metrics, completenessScore }: { persona: Persona; metrics: DashboardMetrics; completenessScore: number }) {
  const hasCritical = metrics.critical_stockout_count > 0;
  const riskTone: Tone = hasCritical ? "critical" : "healthy";
  const capitalTone: Tone = metrics.recoverable_capital > 0 ? "warning" : "healthy";
  const reorderTone: Tone = metrics.reorder_count > 0 ? "warning" : "healthy";
  const abc = metrics.abc_summary;

  if (persona === "ceo") {
    return (
      <div className="space-y-5 sm:space-y-6">
        <PersonaBrief persona="ceo" metrics={metrics} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Financial Exposure" value={formatCurrency(metrics.total_inventory_value, true)} note="Current inventory value under management." icon={CircleDollarSign} tone="neutral" />
          <MetricTile label="Idle Capital" value={formatCurrency(metrics.dead_stock_value, true)} note={`${metrics.dead_stock_count} SKU${metrics.dead_stock_count === 1 ? "" : "s"} currently tying up capital without productive movement.`} icon={TrendingDown} tone={metrics.dead_stock_count > 0 ? "critical" : "healthy"} />
          <MetricTile label="Capital Efficiency" value={formatCurrency(metrics.slow_mover_value, true)} note={`${metrics.slow_mover_count} SKU${metrics.slow_mover_count === 1 ? "" : "s"} require capital-efficiency review.`} icon={Package} tone={metrics.slow_mover_count > 0 ? "warning" : "healthy"} />
          <MetricTile label="Inventory Turnover" value={`${metrics.turnover_ratio}x`} note="Estimated performance from validated metrics." icon={BarChart3} tone="info" />
        </div>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">Top Executive Decisions</h2>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            <ActionCard
              title="Protect revenue continuity"
              issue={`${metrics.critical_stockout_count} Revenue Continuity Risk item${metrics.critical_stockout_count === 1 ? "" : "s"} flagged.`}
              impact="Availability exposure can translate into missed demand, customer escalation, or operational disruption."
              action="Ask the operating team to confirm replenishment timing and escalation ownership."
              outcome="Higher confidence that business-critical availability risk is contained."
              timeline="Today"
              priority={hasCritical ? "Board attention" : "Monitor"}
              tone={riskTone}
              icon={ShieldCheck}
            />
            <ActionCard
              title="Release idle working capital"
              issue={`${formatCurrency(metrics.recoverable_capital, true)} is identified as Estimated Recoverable Capital.`}
              impact="Excess and idle inventory can constrain cash flow and reduce balance-sheet flexibility."
              action="Prioritise a finance-led review of policy-based recovery opportunities."
              outcome="A ranked capital-release agenda with realistic execution owners."
              timeline="This week"
              priority={metrics.recoverable_capital > 0 ? "High" : "Low"}
              tone={capitalTone}
              icon={CircleDollarSign}
            />
            <ActionCard
              title="Improve inventory productivity"
              issue={`Inventory Turnover is estimated at ${metrics.turnover_ratio}x.`}
              impact="Low productivity may indicate capital tied up ahead of demand or weak replenishment discipline."
              action="Review turnover drivers alongside ABC concentration and ageing evidence."
              outcome="Clear decisions on whether to reduce, rebalance, or protect inventory investment."
              timeline="Next review cycle"
              priority="Strategic"
              tone="info"
              icon={BarChart3}
            />
          </div>
        </section>
      </div>
    );
  }

  if (persona === "operations") {
    return (
      <div className="space-y-5 sm:space-y-6">
        <PersonaBrief persona="operations" metrics={metrics} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Service Level Exposure" value={String(metrics.stockout_risk_count)} note={`${metrics.critical_stockout_count} critical supply-continuity risk${metrics.critical_stockout_count === 1 ? "" : "s"}.`} icon={AlertTriangle} tone={metrics.stockout_risk_count > 0 ? "critical" : "healthy"} />
          <MetricTile label="Inventory Balance" value={`${metrics.health_score}/100`} note={`${getHealthLabel(metrics.health_score)} policy-based health position.`} icon={ShieldCheck} tone={healthTone(metrics.health_score)} />
          <MetricTile label="ABC Mix" value={`A ${abc.a_count} | B ${abc.b_count} | C ${abc.c_count}`} note={`A-items drive ${abc.a_revenue_pct}% Annual Consumption Value.`} icon={ClipboardList} tone="info" />
          <MetricTile label="Average Age" value={averageInventoryAge(metrics)} note="Movement-history or turnover-derived age signal." icon={Clock} tone={metrics.aging_metrics?.has_ageing_data ? "warning" : "neutral"} />
        </div>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-white">Operations Command Centre</h2>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
            <ActionCard
              title="Stabilise supply continuity"
              issue={`${metrics.critical_stockout_count} critical operating risk${metrics.critical_stockout_count === 1 ? "" : "s"} need review.`}
              impact="Unresolved shortages can disrupt production plans and service-level commitments."
              action="Confirm replenishment date, substitute availability, and escalation owner for each critical item."
              outcome="Reduced service disruption risk and clearer daily execution ownership."
              timeline="Today"
              priority={hasCritical ? "Immediate" : "Stable"}
              tone={riskTone}
              icon={AlertTriangle}
            />
            <ActionCard
              title="Rebalance excess inventory"
              issue={`${metrics.slow_mover_count} capital-efficiency SKU${metrics.slow_mover_count === 1 ? "" : "s"} are tying up operational capacity.`}
              impact="Excess inventory can reduce warehouse flexibility and hide demand-planning issues."
              action="Review slow movers with demand planners and define reduce, transfer, or hold decisions."
              outcome="Improved warehouse capacity and stronger cash-flow discipline."
              timeline="This week"
              priority={metrics.slow_mover_count > 0 ? "High" : "Monitor"}
              tone={metrics.slow_mover_count > 0 ? "warning" : "healthy"}
              icon={Package}
            />
            <ActionCard
              title="Protect A-item availability"
              issue={`A-items represent ${abc.a_revenue_pct}% of Annual Consumption Value across ${abc.a_count} SKU${abc.a_count === 1 ? "" : "s"}.`}
              impact="A-item instability can disproportionately affect service continuity and management attention."
              action="Validate safety stock, lead time assumptions, and replenishment cadence for A-class items."
              outcome="Better operating focus on the items that matter most to continuity."
              timeline="Next planning meeting"
              priority="Focused"
              tone="info"
              icon={ClipboardList}
            />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PersonaBrief persona="procurement" metrics={metrics} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Order Today" value={String(metrics.critical_stockout_count)} note="Critical supply-continuity risks to confirm first." icon={ShoppingCart} tone={hasCritical ? "critical" : "healthy"} />
        <MetricTile label="Review This Week" value={String(metrics.reorder_count)} note="Current reorder recommendation queue." icon={ClipboardList} tone={reorderTone} />
        <MetricTile label="Hold Purchase" value={formatCurrency(metrics.recoverable_capital, true)} note="Policy-based capital review before additional buying." icon={TrendingDown} tone={capitalTone} />
        <MetricTile label="Verify Lead Time" value={`${metrics.stockout_risk_count} items`} note="Risk items where timing assumptions matter." icon={Clock} tone={metrics.stockout_risk_count > 0 ? "warning" : "healthy"} />
      </div>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Today's Purchasing Workbench</h2>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <ActionCard
            title="Order Today"
            issue={`${metrics.critical_stockout_count} critical replenishment item${metrics.critical_stockout_count === 1 ? "" : "s"} may need immediate purchasing action.`}
            impact="Delayed purchase action can increase supply-continuity and service-level risk."
            action="Confirm supplier availability, purchase timing, and budget approval for critical items."
            outcome="Critical purchasing decisions are sequenced before routine buying."
            timeline="Today"
            priority={hasCritical ? "Immediate" : "Monitor"}
            tone={riskTone}
            icon={ShoppingCart}
          />
          <ActionCard
            title="Review This Week"
            issue={`${metrics.reorder_count} reorder recommendation${metrics.reorder_count === 1 ? "" : "s"} require purchasing triage.`}
            impact="Unprioritised buying can either miss urgent demand or overcommit budget to lower-priority items."
            action="Rank by urgency, ABC class, supplier lead time, and expected order value."
            outcome="A cleaner purchase queue with budget and timing discipline."
            timeline="This week"
            priority={metrics.reorder_count > 0 ? "High" : "Low"}
            tone={reorderTone}
            icon={ClipboardList}
          />
          <ActionCard
            title="Hold Purchase"
            issue={`${formatCurrency(metrics.recoverable_capital, true)} is already flagged for policy-based recovery review.`}
            impact="Buying more into excess positions can worsen idle capital and warehouse pressure."
            action="Pause non-critical replenishment for slow-moving or dead-stock categories until reviewed."
            outcome="Procurement spend aligns with demand and working-capital priorities."
            timeline="Before next PO cycle"
            priority={metrics.recoverable_capital > 0 ? "Control" : "Monitor"}
            tone={capitalTone}
            icon={TrendingDown}
          />
        </div>
      </section>
      <section className="ss-panel p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-white">Purchasing evidence status</h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Recommendations use the same validated metrics and current analysis completeness score of {completenessScore}%. No purchasing formula, threshold, or policy rule is changed in this view.
        </p>
      </section>
    </div>
  );
}
