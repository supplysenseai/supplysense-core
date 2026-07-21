import type { DashboardMetrics } from "@/lib/types";
import { SYSTEM_DEFAULTS } from "@/lib/policy";

export type HealthScoreFactorKey = "dead_stock" | "slow_moving" | "stockout_risk" | "abc";

export interface HealthScoreContribution {
  key: HealthScoreFactorKey;
  label: string;
  score: number;
  weight: number;
  exactContribution: number;
  displayedContribution: number;
  pct: number;
  pctLabel: string;
  detail: string;
  isNeutral: boolean;
}

export function getHealthWeights(metrics: DashboardMetrics) {
  const policy = metrics.active_policy?.policy ?? SYSTEM_DEFAULTS;
  const dead = policy.weight_dead_stock;
  const slow = policy.weight_slow_moving;
  const stockout = policy.weight_stockout_risk;
  const abc = Math.max(0, 100 - dead - slow - stockout);
  return { dead, slow, stockout, abc, total: dead + slow + stockout + abc };
}

function allocateDisplayedContributions(
  rows: Omit<HealthScoreContribution, "displayedContribution">[],
  finalScore: number
) {
  const floors = rows.map((row) => Math.floor(row.exactContribution));
  let remainder = finalScore - floors.reduce((sum, value) => sum + value, 0);
  const ranked = rows
    .map((row, index) => ({
      index,
      fraction: row.exactContribution - Math.floor(row.exactContribution),
      active: row.weight > 0,
    }))
    .sort((a, b) => b.fraction - a.fraction);

  const displayed = [...floors];
  for (const row of ranked) {
    if (remainder <= 0) break;
    if (!row.active) continue;
    displayed[row.index] += 1;
    remainder -= 1;
  }
  return displayed;
}

export function getHealthScoreContributions(metrics: DashboardMetrics): HealthScoreContribution[] {
  const hc = metrics.health_components;
  const weights = getHealthWeights(metrics);
  const abcExcluded = weights.abc === 0;
  const rows: Omit<HealthScoreContribution, "displayedContribution">[] = [
    {
      key: "dead_stock",
      label: "Dead Stock",
      score: Math.round(hc.dead_stock_score),
      weight: weights.dead,
      exactContribution: hc.dead_stock_score * (weights.dead / 100),
      pct: hc.dead_stock_pct,
      pctLabel: `${hc.dead_stock_pct}% of SKUs`,
      detail: `${hc.dead_stock_pct.toFixed(1)}% of SKUs classified as dead stock`,
      isNeutral: false,
    },
    {
      key: "slow_moving",
      label: "Slow Movers",
      score: Math.round(hc.slow_mover_score),
      weight: weights.slow,
      exactContribution: hc.slow_mover_score * (weights.slow / 100),
      pct: hc.slow_mover_pct,
      pctLabel: `${hc.slow_mover_pct}% of SKUs`,
      detail: `${hc.slow_mover_pct.toFixed(1)}% of SKUs classified as slow moving`,
      isNeutral: false,
    },
    {
      key: "stockout_risk",
      label: "Stockout Risk",
      score: Math.round(hc.stockout_score),
      weight: weights.stockout,
      exactContribution: hc.stockout_score * (weights.stockout / 100),
      pct: hc.stockout_risk_pct,
      pctLabel: `${hc.stockout_risk_pct}% at risk`,
      detail: `${hc.stockout_risk_pct.toFixed(1)}% of SKUs at or below reorder point`,
      isNeutral: false,
    },
    {
      key: "abc",
      label: abcExcluded ? "ABC Profile" : "ABC Quality",
      score: abcExcluded ? 100 : Math.round(hc.abc_score),
      weight: weights.abc,
      exactContribution: (abcExcluded ? 100 : hc.abc_score) * (weights.abc / 100),
      pct: hc.a_item_revenue_pct,
      pctLabel: `A-items: ${hc.a_item_revenue_pct}% consumption value`,
      detail: abcExcluded
        ? "Informational only; normal Pareto concentration is not penalised"
        : `A-items represent ${hc.a_item_revenue_pct.toFixed(1)}% of annual consumption value`,
      isNeutral: abcExcluded,
    },
  ];

  const displayed = allocateDisplayedContributions(rows, metrics.health_score);
  return rows.map((row, index) => ({ ...row, displayedContribution: displayed[index] }));
}

export function getHealthFormula(metrics: DashboardMetrics) {
  return getHealthScoreContributions(metrics)
    .map((row) => `(${row.score} x ${(row.weight / 100).toFixed(2)})`)
    .join(" + ");
}
