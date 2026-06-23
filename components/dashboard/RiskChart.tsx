"use client";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { DashboardMetrics } from "@/lib/types";
import { openDrilldown } from "@/lib/drilldown";

const RISK_COLORS: Record<string, string> = {
  Low:      "#10b981",
  Watch:    "#3b82f6",
  Elevated: "#f59e0b",
  Critical: "#ef4444",
  Dead:     "#a78bfa",
};

interface RiskChartProps {
  metrics: DashboardMetrics;
}

export function RiskChart({ metrics }: RiskChartProps) {
  const { risk_distribution } = metrics;

  const data = [
    { name: "Low",      value: risk_distribution.low },
    { name: "Watch",    value: risk_distribution.watch },
    { name: "Elevated", value: risk_distribution.elevated },
    { name: "Critical", value: risk_distribution.critical },
    { name: "Dead",     value: risk_distribution.dead },
  ];

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div>
        <p className="text-[11px] text-slate-500 font-medium mb-0.5">Risk distribution</p>
        <p className="text-[10px] text-slate-600">SKUs by stockout risk tier · <span className="text-[#818cf8]">click a bar to drill through</span></p>
      </div>

      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 8,
                fontSize: 12,
                padding: "6px 10px",
              }}
              labelStyle={{ color: "#f1f5f9", marginBottom: 2 }}
              itemStyle={{ color: "#94a3b8" }}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <Bar
              dataKey="value"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
              style={{ cursor: "pointer" }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={(d: any) => d?.name && openDrilldown({ chart: "risk_distribution", segment: d.name as string }, metrics)}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={RISK_COLORS[entry.name]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Count row */}
      <div className="flex items-center gap-3 flex-wrap">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: RISK_COLORS[d.name] }} />
            <span className="text-[11px] text-slate-500">{d.name}</span>
            <span className="text-[11px] text-slate-300 font-medium">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
