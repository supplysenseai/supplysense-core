import Link from "next/link";
import { formatCurrency, truncate, getRiskColor } from "@/lib/utils";
import type { AnalyzedSKU } from "@/lib/types";
import { cn } from "@/lib/utils";

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

interface TopRiskTableProps {
  items: AnalyzedSKU[];
  limit?: number;
}

export function TopRiskTable({ items, limit = 10 }: TopRiskTableProps) {
  const visible = limit ? items.slice(0, limit) : items;
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div>
          <h3 className="text-sm font-semibold text-white">Top risk items</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Requires immediate or near-term action</p>
        </div>
        <Link href="/dashboard/risk" target="_blank" rel="noopener noreferrer" className="text-xs text-[#818cf8] hover:text-white transition-colors">
          Full analysis →
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-white/5">
              {["SKU", "Product", "ABC", "Status", "Days left", "Lead time", "Risk", "Value", "Action"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[10px] font-medium text-slate-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {visible.map((item, i) => {
              const status = STATUS_BADGES[item.scenario] ?? STATUS_BADGES.HEALTHY;
              const abc = ABC_BADGES[item.abc_class];
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
                  {/* SKU */}
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                    {item.sku_id}
                  </td>
                  {/* Product */}
                  <td className="px-4 py-3 text-xs font-medium text-white">
                    {truncate(item.product_name, 26)}
                  </td>
                  {/* ABC */}
                  <td className="px-4 py-3">
                    <span className={cn("badge", abc.bg, abc.text)}>
                      {item.abc_class}
                    </span>
                  </td>
                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={cn("badge", status.bg, status.text)}>
                      {status.label}
                    </span>
                  </td>
                  {/* Days left */}
                  <td className={cn("px-4 py-3 text-xs font-medium", daysIsCritical ? "text-red-400" : "text-slate-300")}>
                    {daysLeft === "∞" ? "∞" : `${daysLeft}d`}
                  </td>
                  {/* Lead time */}
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {item.lead_time_days}d
                  </td>
                  {/* Risk score mini bar */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="risk-bar-track">
                        <div
                          className="risk-bar-fill"
                          style={{ width: `${item.stockout_risk_score}%`, background: riskColor }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-400">{item.stockout_risk_score}</span>
                    </div>
                  </td>
                  {/* Value */}
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                    {formatCurrency(item.inventory_value, true)}
                  </td>
                  {/* Action */}
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
  );
}
