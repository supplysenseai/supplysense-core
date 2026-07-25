"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package, TrendingDown, AlertTriangle, RotateCcw,
  DollarSign, BarChart3, ShoppingCart, Upload, Bell, Menu,
  FileDown, CheckCircle2, RefreshCw, UserCircle, X, ShieldCheck, Settings,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DemoWelcomeToast } from "@/components/demo/DemoBanner";
import {
  CompactIntelligenceGrid,
  ControlTowerDecisionBrief,
  ControlTowerHeader,
  ControlTowerPriorities,
  ExecutiveCommandBar,
  QuickNavigation,
  ThinMetadataFooter,
} from "@/components/dashboard/DashboardNarrative";
import { formatCurrency } from "@/lib/utils";
import { clearStoredDashboardMetrics, readStoredDashboardMetrics } from "@/lib/dashboard-storage";
import { isDemoMode, hasSessionData, clearSession } from "@/lib/demo-loader";
import { DEMO_ANALYSIS_DATE } from "@/lib/demo-data";
import { MODE_LABELS, MODE_DESCRIPTIONS } from "@/lib/analysis-detector";
import { computeCompleteness } from "@/lib/data-completeness";
import type { DashboardMetrics } from "@/lib/types";
import type { ActivePolicy } from "@/lib/policy";
import { getAuth, clearAuth } from "@/lib/auth";

// Inline demo loader button used in the no-data gate screen
function NoDataDemoButton() {
  const [loading, setLoading] = useState(false);
  const handleClick = async () => {
    setLoading(true);
    const { loadDemoIntoSession } = await import("@/lib/demo-loader");
    loadDemoIntoSession();
    window.location.assign("/dashboard");
  };
  return (
    <button onClick={handleClick} disabled={loading}
      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/8 text-slate-300 text-sm border border-white/8 transition-colors disabled:opacity-60">
      {loading
        ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Loading demo…</>
        : <>Start Demo Mode</>
      }
    </button>
  );
}

function exportPOCsv(recs: DashboardMetrics["reorder_recommendations"]) {
  const header = "SKU,Product Name,Supplier,ABC Class,Order Qty (EOQ),Reorder Point,Days Until Stockout,Urgency,Unit Cost,Est. Order Value";
  const rows = recs.map((r) =>
    [r.sku_id, `"${r.product_name}"`, `"${r.supplier_name}"`, r.abc_class,
     r.eoq, r.rop, isFinite(r.days_until_stockout) ? r.days_until_stockout : "—",
     r.urgency.replace(/_/g, " "), r.unit_cost.toFixed(2), (r.eoq * r.unit_cost).toFixed(2)
    ].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Event2Act-PO-Draft-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function ReorderList({ metrics }: { metrics: DashboardMetrics }) {
  const recs = metrics.reorder_recommendations.slice(0, 6);

  const URGENCY = {
    immediate: { bg: "bg-red-500/15", text: "text-red-300", border: "border-red-500/20", label: "Now" },
    this_week: { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/20", label: "This week" },
    this_month: { bg: "bg-blue-500/15", text: "text-blue-300", border: "border-blue-500/20", label: "This month" },
    planned: { bg: "bg-slate-500/15", text: "text-slate-300", border: "border-slate-500/20", label: "Planned" },
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div>
          <h3 className="text-sm font-semibold text-white">Reorder recommendations</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">EOQ-optimized · 95% service level</p>
        </div>
        <button
          onClick={() => exportPOCsv(metrics.reorder_recommendations)}
          disabled={metrics.reorder_recommendations.length === 0}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[#818cf8] hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Export PO draft
        </button>
      </div>

      <div className="divide-y divide-white/4">
        {recs.map((rec) => {
          const u = URGENCY[rec.urgency];
          return (
            <div key={rec.sku_id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/2 transition-colors">
              <span className={`badge border ${u.bg} ${u.text} ${u.border} shrink-0`}>{u.label}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">{rec.product_name}</div>
                <div className="text-[11px] text-slate-500">{rec.sku_id} · {rec.supplier_name}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-medium text-white">EOQ {rec.eoq} units</div>
                <div className="text-[11px] text-slate-500">
                  {isFinite(rec.days_until_stockout) ? `${rec.days_until_stockout}d left` : "—"}
                </div>
              </div>
            </div>
          );
        })}
        {recs.length === 0 && (
          <div className="px-5 py-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-xs font-medium text-slate-300">No critical reorders needed</p>
            <p className="text-[11px] text-slate-600 mt-1">Current stock coverage is within policy.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<{ name: string; email: string; plan: string } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
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
        // Load active policy — prefer metrics.active_policy, fall back to session
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
    // No data at all — signal redirect state
    setNoData(true);
  }, []);

  // No session data → prompt to upload or start demo
  if (noData) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617] px-4">
        <div className="card p-8 max-w-md w-full text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-[#6366f1]/15 border border-[#6366f1]/25 flex items-center justify-center mx-auto">
            <Upload className="w-5 h-5 text-[#818cf8]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white mb-1.5" style={{ fontFamily: "Syne, sans-serif" }}>No data loaded yet</h2>
            <p className="text-xs text-slate-500 leading-relaxed">Upload your inventory file for a live analysis, or start the interactive demo to explore the platform.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/upload"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-medium transition-colors">
              <Upload className="w-3.5 h-3.5" />
              Upload your inventory
            </Link>
            <NoDataDemoButton />
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617]">
        <div className="card px-6 py-5 flex flex-col items-center gap-3 min-w-64">
          <RefreshCw className="w-6 h-6 text-[#818cf8] animate-spin" />
          <span className="text-sm text-slate-400">Loading analysis…</span>
          <span className="text-[11px] text-slate-600">Preparing your dashboard</span>
        </div>
      </div>
    );
  }

  const mode = metrics.analysis_mode ?? "health";
  const completeness = computeCompleteness(detectedFields);
  const displayDate = new Date(isDemo ? DEMO_ANALYSIS_DATE : Date.now());
  return (
    <div className="flex h-screen bg-[#020617] ss-page overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
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
                {isDemo ? "Demo dataset" : filename} · {metrics.total_skus} SKUs ·{" "}
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
              {/* Compact theme toggle */}
              <div className="hidden sm:block">
                <ThemeSwitcher variant="compact" />
              </div>

              {/* Bell with dropdown */}
              <div className="relative">
                <button
                  aria-label={metrics.critical_stockout_count > 0 ? `${metrics.critical_stockout_count} critical alerts` : "Notifications"}
                  onClick={() => setBellOpen((o) => !o)}
                  className="relative p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  {metrics.critical_stockout_count > 0 && (
                    <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
                  )}
                </button>
                {bellOpen && (
                  <div className="absolute right-0 top-9 w-72 card border border-white/10 shadow-2xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                      <span className="text-xs font-semibold text-white">Alerts</span>
                      <button onClick={() => setBellOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-white/4">
                      {metrics.top_risk_items.slice(0, 5).map((item) => (
                        <div key={item.sku_id} className="px-4 py-2.5 hover:bg-white/2 transition-colors">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className={`w-3 h-3 mt-0.5 flex-shrink-0 ${item.scenario === "CRITICAL" ? "text-red-400" : "text-amber-400"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium text-white truncate">{item.product_name}</p>
                              <p className="text-[10px] text-slate-500">
                                {item.scenario === "CRITICAL"
                                  ? `Stockout in ${isFinite(item.days_stock_remaining) ? Math.round(item.days_stock_remaining) : "—"}d`
                                  : item.scenario === "DEAD" ? "Dead stock — no movement" : "Slow mover"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {metrics.critical_stockout_count === 0 && (
                        <div className="px-4 py-4 text-center text-xs text-slate-500">No active alerts</div>
                      )}
                    </div>
                    <div className="px-4 py-2.5 border-t border-white/5">
                      <Link href="/dashboard/insights" onClick={() => setBellOpen(false)}
                        className="text-[11px] text-[#818cf8] hover:text-white transition-colors">
                        View full analysis →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* User avatar + dropdown */}
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

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1280px] mx-auto px-4 pt-5 pb-28 sm:pt-6 sm:pb-32 space-y-5 sm:space-y-6">

            <ControlTowerHeader
              metrics={metrics}
              rowCount={rowCount}
              isDemo={isDemo}
              activePolicy={activePolicy}
              displayDate={displayDate}
            />

            <ExecutiveCommandBar metrics={metrics} />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.45fr_0.55fr]">
              <ControlTowerPriorities metrics={metrics} />
              <ControlTowerDecisionBrief metrics={metrics} />
            </div>

            <CompactIntelligenceGrid metrics={metrics} completenessScore={completeness.score} />

            <QuickNavigation />

            <ThinMetadataFooter
              metrics={metrics}
              rowCount={rowCount}
              isDemo={isDemo}
              activePolicy={activePolicy}
              completenessScore={completeness.score}
            />
          </div>
        </main>
      </div>
      <DemoWelcomeToast />
    </div>
  );
}

