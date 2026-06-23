"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, RefreshCw, Upload, ShieldCheck } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LineChart, Line, ReferenceLine } from "recharts";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { KPIInfoTrigger } from "@/components/dashboard/KPIInfoModal";
import { formatCurrency } from "@/lib/utils";
import type { DashboardMetrics, AnalyzedSKU } from "@/lib/types";
import { openDrilldown } from "@/lib/drilldown";

const ABC_CONFIG = {
  A: { color: "#10b981", bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400",
       desc: "Top revenue contributors. Highest priority — monitor closely, keep safety stock, never stockout." },
  B: { color: "#3b82f6", bg: "bg-blue-500/10",    border: "border-blue-500/20",    text: "text-blue-400",
       desc: "Mid-tier items with moderate revenue. Balanced ordering — review monthly." },
  C: { color: "#6366f1", bg: "bg-indigo-500/10",  border: "border-indigo-500/25",  text: "text-indigo-400",
       desc: "Low revenue, high SKU count. Candidates for rationalisation or lean inventory policies." },
};

type ABCTab = "A" | "B" | "C";

export default function ABCAnalysisPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [noData, setNoData] = useState(false);
  const [activeTab, setActiveTab] = useState<ABCTab>("A");

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

  const abc = metrics.abc_summary;
  // Use all_skus so healthy A-class items (not at risk) are still shown
  const allItems: AnalyzedSKU[] = metrics.all_skus?.length
    ? metrics.all_skus
    : metrics.top_risk_items;

  // Group items by ABC class from available data
  const byClass = {
    A: allItems.filter((i) => i.abc_class === "A"),
    B: allItems.filter((i) => i.abc_class === "B"),
    C: allItems.filter((i) => i.abc_class === "C"),
  };

  // Pareto chart data
  const paretoData = [
    { name: "A-Class", skus: abc.a_count, revenue: abc.a_revenue_pct, fill: "#10b981" },
    { name: "B-Class", skus: abc.b_count, revenue: abc.b_revenue_pct, fill: "#3b82f6" },
    { name: "C-Class", skus: abc.c_count, revenue: abc.c_revenue_pct, fill: "#6366f1" },
  ];

  // Cumulative for Pareto line
  let cumulative = 0;
  const paretoLine = paretoData.map((d) => {
    cumulative += d.revenue;
    return { ...d, cumulative };
  });

  const totalSkus = abc.a_count + abc.b_count + abc.c_count;

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
              <BarChart3 className="w-3.5 h-3.5 text-[#818cf8]" /> ABC Analysis
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1060px] mx-auto px-4 py-6 space-y-5">

            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: "Syne, sans-serif" }}>
                ABC Analysis
                <KPIInfoTrigger kpiKey="abc_analysis" metrics={metrics} />
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Pareto-based classification. A-items drive ~70% of revenue with ~{Math.round((abc.a_count/totalSkus)*100)}% of SKUs.
              </p>
            </div>

            {/* Transparency statement */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <p className="text-[11px] text-slate-500">
                <span className="text-emerald-400 font-medium">Transparent classification.</span>
                {" "}All calculations are based on your uploaded data and can be independently verified.
              </p>
            </div>

            {/* ABC summary cards */}
            <div className="grid grid-cols-3 gap-4">
              {(["A","B","C"] as ABCTab[]).map((cls) => {
                const cfg = ABC_CONFIG[cls];
                const count = abc[`${cls.toLowerCase()}_count` as keyof typeof abc] as number;
                const rev   = abc[`${cls.toLowerCase()}_revenue_pct` as keyof typeof abc] as number;
                const skuPct = totalSkus > 0 ? Math.round((count / totalSkus) * 100) : 0;
                return (
                  <div key={cls} className="card p-5 text-center space-y-2">
                    <div className={`w-10 h-10 rounded-xl mx-auto flex items-center justify-center text-lg font-bold ${cfg.bg} ${cfg.text}`}>
                      {cls}
                    </div>
                    <div className={`text-2xl font-bold ${cfg.text}`}>{count}</div>
                    <div className="text-xs text-slate-500">SKUs ({skuPct}% of total)</div>
                    <div className="h-px bg-white/5 my-1" />
                    <div className="text-lg font-semibold text-white">{rev}%</div>
                    <div className="text-xs text-slate-500">of total revenue</div>
                    <div className="h-1.5 bg-white/6 rounded-full overflow-hidden mt-2">
                      <div className="h-full rounded-full" style={{ width: `${rev}%`, background: cfg.color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pareto chart */}
            <div className="card p-6">
              <p className="text-sm font-semibold text-white mb-1">Revenue Distribution (Pareto)</p>
              <p className="text-[11px] text-slate-500 mb-5">Bars = revenue % per class · Line = cumulative revenue</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paretoLine} margin={{ top: 4, right: 24, bottom: 0, left: -16 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "#f1f5f9" }}
                      formatter={(v, name) => [`${Number(v).toFixed(1)}%`, name === "revenue" ? "Revenue share" : "Cumulative"]}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="revenue"
                      radius={[6,6,0,0]}
                      style={{ cursor: "pointer" }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      onClick={(d: any) => d?.name && openDrilldown({ chart: "abc_pareto", segment: (d.name as string).charAt(0) as "A" | "B" | "C" }, metrics)}
                    >
                      {paretoLine.map((d) => <Cell key={d.name} fill={d.fill} fillOpacity={0.85} />)}
                    </Bar>
                    <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", r: 4 }} />
                    <ReferenceLine yAxisId="right" y={80} stroke="rgba(245,158,11,0.3)" strokeDasharray="4 3" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Class descriptions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["A","B","C"] as ABCTab[]).map((cls) => {
                const cfg = ABC_CONFIG[cls];
                return (
                  <div key={cls} className={`card p-4 border ${cfg.border}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-sm font-bold ${cfg.text}`}>{cls}-Class</span>
                      <span className="text-[10px] text-slate-600 bg-white/5 px-1.5 py-0.5 rounded">
                        {cls === "A" ? "≤70% cumulative" : cls === "B" ? "70–90%" : "90–100%"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{cfg.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Item table with tabs */}
            <div className="card overflow-hidden">
              <div className="flex items-center gap-0.5 px-5 pt-4 border-b border-white/5">
                {(["A","B","C"] as ABCTab[]).map((cls) => {
                  const cfg = ABC_CONFIG[cls];
                  const count = abc[`${cls.toLowerCase()}_count` as keyof typeof abc] as number;
                  return (
                    <button
                      key={cls}
                      onClick={() => setActiveTab(cls)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
                        activeTab === cls
                          ? `${cfg.text} border-current`
                          : "text-slate-500 border-transparent hover:text-slate-300"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center ${cfg.bg} ${cfg.text}`}>{cls}</span>
                      {cls}-Class
                      <span className="ml-1 text-[10px] text-slate-600">({count})</span>
                    </button>
                  );
                })}
                <div className="flex-1" />
                <span className="text-[11px] text-slate-600 pb-2 pr-1">
                  {byClass[activeTab].length} items available
                </span>
              </div>
              <div className="overflow-x-auto">
                {byClass[activeTab].length > 0 ? (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5">
                        {["SKU", "Product", "Category", "Stock Qty", "Unit Cost", "Inventory Value", "Risk Score", "Scenario"].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-[10px] text-slate-600 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/4">
                      {byClass[activeTab].slice(0, 50).map((item) => (
                        <tr key={item.sku_id} className="hover:bg-white/2 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">{item.sku_id}</td>
                          <td className="px-4 py-2.5 text-white font-medium max-w-[180px] truncate">{item.product_name}</td>
                          <td className="px-4 py-2.5 text-slate-400">{item.category || "—"}</td>
                          <td className="px-4 py-2.5 text-slate-300 tabular-nums">{item.units_on_hand}</td>
                          <td className="px-4 py-2.5 text-slate-300 tabular-nums">{formatCurrency(item.unit_cost)}</td>
                          <td className="px-4 py-2.5 text-white tabular-nums font-medium">{formatCurrency(item.inventory_value, true)}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-12 h-1 bg-white/6 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${item.stockout_risk_score}%`, background: item.stockout_risk_score >= 75 ? "#ef4444" : "#3b82f6" }} />
                              </div>
                              <span className="text-[11px] text-slate-400">{item.stockout_risk_score}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-[10px] font-medium ${
                              item.scenario === "CRITICAL" ? "text-red-400" :
                              item.scenario === "DEAD" ? "text-purple-400" :
                              item.scenario === "SLOW" ? "text-amber-400" :
                              item.scenario === "HEALTHY" ? "text-emerald-400" : "text-slate-400"
                            }`}>{item.scenario}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-5 py-10 text-center text-xs text-slate-500">
                    No {activeTab}-class items in current view.
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
