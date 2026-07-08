"use client";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KPIKey } from "@/lib/kpi-definitions";
import type { DashboardMetrics } from "@/lib/types";
import { KPIInfoTrigger } from "./KPIInfoModal";

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  valueColor?: string;
  delta?: string;
  deltaPositive?: boolean;
  className?: string;
  animDelay?: number;
  // Explainability
  kpiKey?: KPIKey;
  metrics?: DashboardMetrics;
}

export function KPICard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg = "bg-white/5",
  iconColor = "text-slate-400",
  valueColor = "text-white",
  delta,
  deltaPositive,
  className,
  animDelay = 0,
  kpiKey,
  metrics,
}: KPICardProps) {
  return (
    <div
      className={cn("card-elevated p-4 min-h-[156px] animate-in flex flex-col items-center justify-start text-center relative", className)}
      style={{ animationDelay: `${animDelay}ms`, opacity: 0, animationFillMode: "forwards" }}
    >
      {/* ⓘ trigger — always visible, top-right corner */}
      {kpiKey && metrics && (
        <div className="absolute top-2.5 right-2.5">
          <KPIInfoTrigger kpiKey={kpiKey} metrics={metrics} />
        </div>
      )}

      {/* Icon */}
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", iconBg)}>
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>

      {/* Label */}
      <span className="text-sm text-slate-400 font-medium leading-snug mb-2 pr-5">{label}</span>

      {/* Value */}
      <div className={cn("text-xl sm:text-2xl font-bold leading-tight mb-1 break-words max-w-full", valueColor)}>
        {value}
      </div>

      {/* Sub line */}
      {(sub || delta) && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-auto pt-2">
          {delta && (
            <span className={cn(
              "text-xs font-medium",
              deltaPositive === true ? "text-emerald-400" :
              deltaPositive === false ? "text-red-400" :
              "text-slate-500"
            )}>
              {delta}
            </span>
          )}
          {sub && <span className="text-xs text-slate-600 leading-snug">{sub}</span>}
        </div>
      )}
    </div>
  );
}
