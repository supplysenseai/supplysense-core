"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Clock, AlertTriangle, DollarSign, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { AgingMetrics, DashboardMetrics } from "@/lib/types";
import { openDrilldown } from "@/lib/drilldown";

interface AgingDashboardProps {
  aging: AgingMetrics;
  metrics?: DashboardMetrics;
}

function AgingHealthGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Healthy" : score >= 60 ? "Moderate" : score >= 40 ? "Aging" : "Critical";
  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div
        className="relative w-20 h-20 rounded-full flex items-center justify-center mb-2"
        style={{ background: `conic-gradient(${color} ${score * 3.6}deg, #1e293b ${score * 3.6}deg)` }}
      >
        <div className="w-14 h-14 rounded-full bg-[#0f172a] flex items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <p className="text-xs font-medium" style={{ color }}>{label}</p>
      <p className="text-[10px] text-slate-500 mt-0.5">Ageing Health Score</p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1e293b] border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-white mb-1">{d.label}</p>
      <p className="text-slate-400">{d.count} items ({d.pct_count}%)</p>
      {d.value > 0 && <p className="text-slate-400">{formatCurrency(d.value, true)} ({d.pct_value}%)</p>}
    </div>
  );
};

export function AgingDashboard({ aging, metrics }: AgingDashboardProps) {
  const chartData = aging.buckets.map((b) => ({
    label: b.label,
    count: b.count,
    value: b.value,
    pct_count: b.pct_count,
    pct_value: b.pct_value,
    color: b.color,
  }));

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-blue-400" />
        <h2 className="text-sm font-semibold text-white">Stock Ageing Analysis</h2>
        <span className="ml-auto text-[11px] text-slate-500">{aging.total_items} items analyzed</span>
      </div>

      {/* KPI cards row — Avg Ageing Days + Blocked Capital only (Dead Stock & Slow Moving shown in main dashboard) */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: "Avg Ageing Days",
            value: `${aging.avg_ageing_days}d`,
            icon: Clock,
            color: aging.avg_ageing_days <= 90 ? "text-emerald-400" : aging.avg_ageing_days <= 180 ? "text-amber-400" : "text-red-400",
            bg: "bg-blue-500/10",
            sub: "Weighted by value",
            kpiKey: "avg_ageing_days",
          },
          {
            label: "Blocked Capital",
            value: formatCurrency(metrics ? metrics.recoverable_capital : aging.blocked_capital, true),
            icon: DollarSign,
            color: "text-orange-400",
            bg: "bg-orange-500/10",
            sub: "Dead + slow moving",
            kpiKey: "blocked_capital",
          },
        ].map((card) => (
          <div key={card.label} className="card p-4 relative group">
            {/* ⓘ explainability button */}
            <button
              onClick={() => window.open(`/dashboard/kpi/${card.kpiKey}`, `kpi_${card.kpiKey}`, "width=900,height=700,scrollbars=yes,resizable=yes")}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#6366f1] hover:text-white"
              title="View definition, formula & supporting data"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">{card.label}</span>
              <div className={`${card.bg} p-1.5 rounded-lg`}>
                <card.icon className={`w-3 h-3 ${card.color}`} />
              </div>
            </div>
            <div className={`text-xl font-bold ${card.color} mb-0.5`}>{card.value}</div>
            <div className="text-[10px] text-slate-500">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Chart + score row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Ageing buckets bar chart */}
        <div className="card p-5 lg:col-span-3">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Inventory Ageing Distribution</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Items by days since last movement</p>
          </div>

          {/* Stacked count bar */}
          <div className="mb-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">By item count</p>
            <div className="flex h-6 rounded-lg overflow-hidden gap-0.5">
              {aging.buckets.map((b) =>
                b.pct_count > 0 ? (
                  <div
                    key={b.label}
                    className="flex items-center justify-center text-[9px] font-medium text-white/80 transition-all"
                    style={{ width: `${b.pct_count}%`, backgroundColor: b.color }}
                    title={`${b.label}: ${b.count} items (${b.pct_count}%)`}
                  >
                    {b.pct_count > 8 ? `${b.pct_count}%` : ""}
                  </div>
                ) : null
              )}
            </div>
          </div>

          {/* Bar chart — count */}
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="25%">
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  style={{ cursor: metrics ? "pointer" : "default" }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={(d: any) => metrics && d?.label && openDrilldown({ chart: "aging_bucket", segment: d.label as string }, metrics)}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {aging.buckets.map((b) => (
              <div key={b.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: b.color }} />
                <span className="text-[10px] text-slate-400">{b.label}</span>
                <span className="text-[10px] text-slate-600">({b.count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ageing health score */}
        <div className="card p-4 flex flex-col">
          <h3 className="text-xs font-semibold text-white mb-1">Ageing Health</h3>
          <p className="text-[10px] text-slate-500 mb-2">Value-weighted freshness score</p>
          <div className="flex-1 flex items-center justify-center">
            <AgingHealthGauge score={aging.ageing_health_score} />
          </div>
          <div className="space-y-1.5 mt-2">
            {aging.buckets.slice(0, 3).map((b) => (
              <div key={b.label} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                <span className="text-[10px] text-slate-400 flex-1 truncate">{b.label}</span>
                <span className="text-[10px] font-medium" style={{ color: b.color }}>{b.pct_value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Liquidation opportunities */}
      {aging.liquidation_opportunities.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div>
              <h3 className="text-sm font-semibold text-white">Liquidation Opportunities</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Items 91+ days old, sorted by age × value</p>
            </div>
            <span className="badge bg-orange-500/10 text-orange-400 border border-orange-500/20">
              {aging.liquidation_opportunities.length} items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  {["Item Code", "Item Name", "Category", "Qty", "Ageing", "Bucket", "Value"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {aging.liquidation_opportunities.slice(0, 10).map((item) => {
                  const urgencyColor =
                    item.ageing_days >= 366 ? "text-red-400" :
                    item.ageing_days >= 181 ? "text-orange-400" :
                    "text-amber-400";
                  const badgeBg =
                    item.ageing_days >= 366 ? "bg-red-500/10 border-red-500/20 text-red-400" :
                    item.ageing_days >= 181 ? "bg-orange-500/10 border-orange-500/20 text-orange-400" :
                    "bg-amber-500/10 border-amber-500/20 text-amber-400";
                  return (
                    <tr key={item.item_code} className="hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">{item.item_code}</td>
                      <td className="px-4 py-3 text-white font-medium max-w-[160px] truncate">{item.item_name}</td>
                      <td className="px-4 py-3 text-slate-400">{item.category}</td>
                      <td className="px-4 py-3 text-slate-300">{item.stock_qty.toLocaleString()}</td>
                      <td className={`px-4 py-3 font-semibold ${urgencyColor}`}>{item.ageing_days}d</td>
                      <td className="px-4 py-3">
                        <span className={`badge border ${badgeBg} text-[10px]`}>{item.bucket_label}</span>
                      </td>
                      <td className="px-4 py-3 text-white font-medium">
                        {item.inventory_value > 0 ? formatCurrency(item.inventory_value, true) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {aging.liquidation_opportunities.length > 10 && (
            <div className="px-5 py-3 border-t border-white/5 text-center">
              <span className="text-[11px] text-slate-500">
                +{aging.liquidation_opportunities.length - 10} more items not shown
              </span>
            </div>
          )}
        </div>
      )}

      {/* Warning when no ageing data */}
      {aging.total_items === 0 && (
        <div className="card p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-white mb-1">No ageing data found</p>
          <p className="text-xs text-slate-500">
            Upload a file with an &quot;Ageing Days&quot;, &quot;Last Movement Date&quot;, or similar column to enable ageing analysis.
          </p>
        </div>
      )}
    </div>
  );
}
