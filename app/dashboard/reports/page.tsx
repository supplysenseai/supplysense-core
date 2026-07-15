"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileDown, ShoppingCart, AlertTriangle, TrendingDown,
  BarChart3, FileText, CheckCircle2, RefreshCw, ArrowLeft, Upload,
} from "lucide-react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { formatCurrency } from "@/lib/utils";
import type { DashboardMetrics } from "@/lib/types";

// ── CSV helpers ────────────────────────────────────────────────────────────────
function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportPODraft(metrics: DashboardMetrics) {
  const header = "SKU,Product Name,Supplier,ABC Class,Order Qty (EOQ),Reorder Point,Days Until Stockout,Urgency,Unit Cost,Est. Order Value";
  const rows = metrics.reorder_recommendations.map((r) =>
    [
      r.sku_id,
      `"${r.product_name}"`,
      `"${r.supplier_name}"`,
      r.abc_class,
      r.eoq,
      r.rop,
      isFinite(r.days_until_stockout) ? r.days_until_stockout : "N/A",
      r.urgency.replace(/_/g, " "),
      r.unit_cost.toFixed(2),
      (r.eoq * r.unit_cost).toFixed(2),
    ].join(",")
  );
  downloadCsv(
    `SupplySense-PO-Draft-${new Date().toISOString().split("T")[0]}.csv`,
    [header, ...rows].join("\n")
  );
}

function exportStockoutReport(metrics: DashboardMetrics) {
  const header = "SKU,Product Name,Category,Stock Qty,Daily Velocity,Days Remaining,Risk Score,Scenario,ABC Class,Unit Cost,Inventory Value";
  const rows = metrics.top_risk_items
    .filter((i) => i.scenario === "CRITICAL")
    .map((i) =>
      [
        i.sku_id,
        `"${i.product_name}"`,
        `"${i.category}"`,
        i.units_on_hand,
        i.daily_velocity.toFixed(2),
        isFinite(i.days_stock_remaining) ? Math.round(i.days_stock_remaining) : "N/A",
        i.stockout_risk_score,
        i.scenario,
        i.abc_class,
        i.unit_cost.toFixed(2),
        i.inventory_value.toFixed(2),
      ].join(",")
    );
  downloadCsv(
    `SupplySense-Stockout-Risk-${new Date().toISOString().split("T")[0]}.csv`,
    [header, ...rows].join("\n")
  );
}

function exportDeadStockReport(metrics: DashboardMetrics) {
  const header = "SKU,Product Name,Category,Stock Qty,Unit Cost,Inventory Value,Days Since Last Sale,Scenario,ABC Class,Annual Carrying Cost";
  const items = metrics.top_dead_stock.length > 0
    ? metrics.top_dead_stock
    : metrics.all_skus.filter((i) => i.scenario === "DEAD");
  const rows = items.map((i) =>
    [
      i.sku_id,
      `"${i.product_name}"`,
      `"${i.category}"`,
      i.units_on_hand,
      i.unit_cost.toFixed(2),
      i.inventory_value.toFixed(2),
      i.days_since_last_sale,
      i.scenario,
      i.abc_class,
      (i.inventory_value * 0.25).toFixed(2),
    ].join(",")
  );
  downloadCsv(
    `SupplySense-Dead-Stock-${new Date().toISOString().split("T")[0]}.csv`,
    [header, ...rows].join("\n")
  );
}

function exportInventorySummary(metrics: DashboardMetrics) {
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const aging = metrics.aging_metrics;
  const agingValue = aging?.has_ageing_data ? `${Math.round(aging.avg_ageing_days)} days` : "Not available";
  const agingHealth = aging?.has_ageing_data ? `${aging.ageing_health_score}/100` : "Not available";
  const bucketCount = (label: string) =>
    aging?.has_ageing_data ? String(aging.buckets.find((b) => b.label === label)?.count ?? 0) : "Not available";
  const lines = [
    "SupplySense Inventory Summary Report",
    `Generated: ${date}`,
    "",
    "KPI,Value",
    `Health Score,${metrics.health_score}/100`,
    `Total SKUs,${metrics.total_skus}`,
    `Total Inventory Value,$${metrics.total_inventory_value.toFixed(2)}`,
    `Annual Carrying Cost,$${metrics.annual_carrying_cost.toFixed(2)}`,
    `Dead Stock Value,$${metrics.dead_stock_value.toFixed(2)}`,
    `Dead Stock SKU Count,${metrics.dead_stock_count}`,
    `Slow Mover Value,$${metrics.slow_mover_value.toFixed(2)}`,
    `Slow Mover SKU Count,${metrics.slow_mover_count}`,
    `Stockout Risk SKUs,${metrics.stockout_risk_count}`,
    `Critical Stockout SKUs,${metrics.critical_stockout_count}`,
    `Estimated Recoverable Capital,$${metrics.recoverable_capital.toFixed(2)}`,
    `Estimated Inventory Turnover,${metrics.turnover_ratio}x`,
    `Reorder Actions Needed,${metrics.reorder_count}`,
    `Average Ageing,${agingValue}`,
    `Ageing Health Score,${agingHealth}`,
    `Ageing 0-30 Days,${bucketCount("0-30 Days")}`,
    `Ageing 31-90 Days,${bucketCount("31-90 Days")}`,
    `Ageing 91-180 Days,${bucketCount("91-180 Days")}`,
    `Ageing 181-365 Days,${bucketCount("181-365 Days")}`,
    `Ageing 365+ Days,${bucketCount("365+ Days")}`,
    "",
    "ABC Classification",
    `A-Class SKUs,${metrics.abc_summary.a_count}`,
    `B-Class SKUs,${metrics.abc_summary.b_count}`,
    `C-Class SKUs,${metrics.abc_summary.c_count}`,
    `A-Class Annual Consumption Value Share,${metrics.abc_summary.a_revenue_pct}%`,
    "",
    "Risk Distribution",
    `Critical,${metrics.risk_distribution.critical}`,
    `Dead,${metrics.risk_distribution.dead}`,
    `Elevated,${metrics.risk_distribution.elevated}`,
    `Watch,${metrics.risk_distribution.watch}`,
    `Low,${metrics.risk_distribution.low}`,
  ];
  downloadCsv(
    `SupplySense-Summary-${new Date().toISOString().split("T")[0]}.csv`,
    lines.join("\n")
  );
}

// ── Report card component ──────────────────────────────────────────────────────
interface ReportCardProps {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  meta: string;
  badge?: { label: string; color: string };
  disabled?: boolean;
  onDownload: () => void;
}

function ReportCard({
  icon: Icon, iconBg, iconColor, title, description, meta, badge, disabled, onDownload,
}: ReportCardProps) {
  const [downloaded, setDownloaded] = useState(false);

  function handleDownload() {
    if (disabled) return;
    onDownload();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  }

  return (
    <div className={`card p-5 min-h-[220px] flex flex-col gap-4 transition-all duration-200 ${disabled ? "opacity-40" : "hover:border-white/10"}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {badge && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.color}`}>
                {badge.label}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="mt-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-white/5">
        <span className="text-[10px] text-slate-600">{meta}</span>
        <button
          onClick={handleDownload}
          disabled={disabled}
          className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 sm:w-auto ${
            downloaded
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
              : disabled
              ? "bg-white/4 text-slate-600 cursor-not-allowed"
              : "bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/20 hover:bg-[#6366f1]/25 hover:text-white"
          }`}
        >
          {downloaded ? (
            <><CheckCircle2 className="w-3.5 h-3.5" /> Downloaded</>
          ) : (
            <><FileDown className="w-3.5 h-3.5" /> Download CSV</>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [filename, setFilename] = useState("Inventory");
  const [noData, setNoData] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("supplysense_metrics");
      const fn = sessionStorage.getItem("supplysense_filename");
      if (stored) {
        setMetrics(JSON.parse(stored));
        setFilename(fn?.replace(/\.\w+$/, "") ?? "Inventory");
      } else {
        setNoData(true);
      }
    } catch {
      setNoData(true);
    }
  }, []);

  if (noData) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617] px-4">
        <div className="card p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#6366f1]/15 border border-[#6366f1]/25 flex items-center justify-center mx-auto">
            <Upload className="w-6 h-6 text-[#818cf8]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white mb-1">No data loaded</h2>
            <p className="text-xs text-slate-500">Upload a file or load the demo to generate reports.</p>
          </div>
          <Link href="/upload"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm font-medium transition-colors w-full">
            Upload inventory
          </Link>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617]">
        <div className="card px-6 py-5 flex flex-col items-center gap-3 min-w-60">
          <RefreshCw className="w-5 h-5 text-[#818cf8] animate-spin" />
          <span className="text-xs text-slate-500">Loading reports…</span>
        </div>
      </div>
    );
  }

  const hasReorders = metrics.reorder_recommendations.length > 0;
  const hasRiskItems = metrics.top_risk_items.filter((i) => i.scenario === "CRITICAL").length > 0;
  const hasDeadStock = metrics.dead_stock_count > 0;
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="flex h-screen bg-[#020617] ss-page overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="nav-glass sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center h-[46px] px-4 gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-white/5">
              <FileText className="w-4 h-4" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-xs text-white font-medium">Reports</span>
            <div className="flex-1" />
            <span className="text-[11px] text-slate-600">{today}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[900px] mx-auto px-4 py-5 sm:py-6 space-y-5 sm:space-y-6">

            {/* Page header */}
            <div className="max-w-2xl">
              <h1 className="text-lg font-bold text-white" style={{ fontFamily: "Syne, sans-serif" }}>
                Reports & Exports
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Download structured CSV reports generated from your <span className="text-slate-400">{filename}</span> analysis.
                All files are ready to open in Excel, Google Sheets, or any procurement system.
              </p>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total SKUs", value: String(metrics.total_skus) },
                { label: "Reorder Actions", value: String(metrics.reorder_count) },
                { label: "Dead Stock Items", value: String(metrics.dead_stock_count) },
                { label: "Recoverable", value: formatCurrency(metrics.recoverable_capital, true) },
              ].map((s) => (
                <div key={s.label} className="card-elevated px-3 py-2.5">
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider">{s.label}</p>
                  <p className="text-sm font-semibold text-white mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Report cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <ReportCard
                icon={ShoppingCart}
                iconBg="bg-[#6366f1]/15"
                iconColor="text-[#818cf8]"
                title="PO Draft"
                description="Purchase order template with EOQ quantities, reorder points, supplier names, lead times, and estimated order values. Ready to send directly to procurement."
                meta={`${metrics.reorder_recommendations.length} line items · CSV`}
                badge={hasReorders ? { label: "Action required", color: "bg-amber-500/15 text-amber-400" } : undefined}
                disabled={!hasReorders}
                onDownload={() => exportPODraft(metrics!)}
              />

              <ReportCard
                icon={AlertTriangle}
                iconBg="bg-red-500/10"
                iconColor="text-red-400"
                title="Stockout Risk Report"
                description="Items classified as Critical, matching the dashboard Stockout Risk KPI. Includes stock levels, daily velocity, risk scores, and ABC classification."
                meta={`${metrics.stockout_risk_count} critical items · CSV`}
                badge={metrics.critical_stockout_count > 0 ? { label: `${metrics.critical_stockout_count} critical`, color: "bg-red-500/15 text-red-400" } : undefined}
                disabled={!hasRiskItems}
                onDownload={() => exportStockoutReport(metrics!)}
              />

              <ReportCard
                icon={TrendingDown}
                iconBg="bg-purple-500/10"
                iconColor="text-purple-400"
                title="Dead Stock Report"
                description="Items classified as Dead Stock only. Slow Moving inventory remains a separate population and is not included in this export."
                meta={`${metrics.dead_stock_count} dead stock items · CSV`}
                badge={{ label: formatCurrency(metrics.dead_stock_value, true) + " locked", color: "bg-purple-500/15 text-purple-400" }}
                disabled={!hasDeadStock}
                onDownload={() => exportDeadStockReport(metrics!)}
              />

              <ReportCard
                icon={BarChart3}
                iconBg="bg-emerald-500/10"
                iconColor="text-emerald-400"
                title="Inventory Summary"
                description="Full KPI summary including health score, ABC annual consumption value distribution, ageing, risk breakdown, carrying costs, and estimated recoverable capital."
                meta="All KPIs · CSV"
                onDownload={() => exportInventorySummary(metrics!)}
              />
            </div>

            {/* Executive brief link */}
            <div className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#6366f1]/15 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-[#818cf8]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">Executive Brief</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Full narrative analysis with critical risks, recommendations, and strategic actions.
                  Use your browser&apos;s print function (Ctrl+P) to save as PDF.
                </p>
              </div>
              <Link
                href="/dashboard/insights"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#6366f1]/15 text-[#818cf8] border border-[#6366f1]/20 hover:bg-[#6366f1]/25 hover:text-white transition-colors flex-shrink-0"
              >
                View Brief →
              </Link>
            </div>

            <p className="text-[11px] text-slate-700 text-center pb-2">
              All exports are generated client-side. No data is sent to any server.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
