"use client";
import type { DashboardMetrics, AnalyzedSKU } from "@/lib/types";
import { getHealthLabel, formatCurrency } from "@/lib/utils";
import { computeCompleteness } from "@/lib/data-completeness";

// ── Output types ───────────────────────────────────────────────────────────────

export type RiskSeverity = "critical" | "high" | "medium" | "low";
export type ActionTimeline = "Immediate" | "This week" | "This month" | "Next quarter";
export type ActionOwner = "Procurement" | "Supply Chain" | "Finance" | "Operations" | "CEO";

export interface RiskItem {
  severity: RiskSeverity;
  title: string;
  detail: string;
  affected_skus: number;
  financial_exposure: number;
}

export interface RecommendedAction {
  priority: number;
  action: string;
  rationale: string;
  timeline: ActionTimeline;
  owner: ActionOwner;
  estimated_impact: string;
}

export interface PriorityItem {
  sku_id: string;
  product_name: string;
  scenario: string;
  abc_class: string;
  urgency_label: string;
  action_label: string;
  value: number;
  days_left: number | null;
}

export interface ExecutiveSummary {
  generated_at: string;
  health_overview: {
    headline: string;
    status: string;
    score: number;
    body: string;
    signal: "positive" | "caution" | "warning" | "critical";
  };
  key_risks: RiskItem[];
  financial_impact: {
    headline: string;
    body: string;
    metrics: Array<{ label: string; value: string; sub?: string; highlight?: boolean }>;
  };
  recommended_actions: RecommendedAction[];
  priority_items: PriorityItem[];
  audience_notes: {
    ceo: string;
    supply_chain: string;
    procurement: string;
  };
  data_completeness?: {
    score: number;
    tier_label: string;
    tier_color: string;
    missing_fields: Array<{ label: string; unlocks: string[] }>;
    note: string;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function $ (v: number) { return formatCurrency(v, true); }

function scoreSignal(score: number): "positive" | "caution" | "warning" | "critical" {
  if (score >= 80) return "positive";
  if (score >= 60) return "caution";
  if (score >= 40) return "warning";
  return "critical";
}

// Picks a professional synonym so repeated sentences don't feel like mail-merge
function pick<T>(arr: T[]): T { return arr[Math.floor(arr.length * 0.5)]; }

// ── Main generator ─────────────────────────────────────────────────────────────

export function generateExecutiveSummary(metrics: DashboardMetrics, detectedFields: string[] = []): ExecutiveSummary {
  const {
    health_score, health_components,
    total_inventory_value, annual_carrying_cost,
    dead_stock_value, dead_stock_count, dead_stock_carrying_cost,
    slow_mover_value, slow_mover_count,
    stockout_risk_count, critical_stockout_count,
    recoverable_capital, turnover_ratio,
    reorder_count, total_skus,
    abc_summary, top_risk_items, reorder_recommendations,
  } = metrics;

  const status = getHealthLabel(health_score);
  const deadPct  = pct(dead_stock_count,  total_skus);
  const slowPct  = pct(slow_mover_count,  total_skus);
  const riskPct  = pct(stockout_risk_count, total_skus);
  const totalProblem = dead_stock_count + slow_mover_count + critical_stockout_count;
  const problemPct   = pct(totalProblem, total_skus);

  // ── 1. Health Overview ───────────────────────────────────────────────────────
  const overviewHeadlines: Record<string, string> = {
    Excellent: "Inventory operations are performing at a high standard across all key metrics.",
    Good:      "Inventory health is solid with targeted improvement opportunities identified.",
    Fair:      "Inventory performance is below the selected review standard — structural issues require near-term resolution.",
    Poor:      "Inventory health is critically impaired. Executive review is warranted.",
  };

  const overviewBody = buildOverviewBody(
    status, health_score, total_skus, deadPct, slowPct, riskPct,
    turnover_ratio, abc_summary.a_count, abc_summary.a_revenue_pct,
    total_inventory_value, recoverable_capital
  );

  // ── 2. Key Risks ─────────────────────────────────────────────────────────────
  const risks: RiskItem[] = [];

  if (critical_stockout_count > 0) {
    const topStockout = top_risk_items.find(r => r.scenario === "CRITICAL");
    risks.push({
      severity: "critical",
      title: `${critical_stockout_count} SKU${critical_stockout_count > 1 ? "s" : ""} facing imminent stockout`,
      detail: `${critical_stockout_count} item${critical_stockout_count > 1 ? "s are" : " is"} projected to reach zero stock before the next replenishment cycle completes. ${topStockout ? `"${topStockout.product_name}" (${topStockout.abc_class}-class) has the highest exposure at ${Math.floor(topStockout.days_stock_remaining)}d remaining — below its ${topStockout.lead_time_days}d lead time.` : ""} Fulfilment continuity may be at risk based on current usage and lead time.`,
      affected_skus: critical_stockout_count,
      financial_exposure: top_risk_items
        .filter(r => r.scenario === "CRITICAL")
        .reduce((s, r) => s + r.inventory_value, 0),
    });
  }

  if (stockout_risk_count > critical_stockout_count) {
    const watchCount = stockout_risk_count - critical_stockout_count;
    risks.push({
      severity: "high",
      title: `${watchCount} additional SKU${watchCount > 1 ? "s" : ""} approaching reorder threshold`,
      detail: `Beyond the critical tier, ${watchCount} SKU${watchCount > 1 ? "s are" : " is"} within 1.5× lead-time coverage. Reviewing reorder timing this week may reduce escalation risk. ${reorder_count > 0 ? `${reorder_count} reorder action${reorder_count > 1 ? "s" : ""} are currently flagged by policy.` : ""}`,
      affected_skus: watchCount,
      financial_exposure: 0,
    });
  }

  if (dead_stock_count > 0) {
    const deadStockDays = metrics.active_policy?.policy.dead_stock_days ?? 365;
    risks.push({
      severity: dead_stock_value > total_inventory_value * 0.15 ? "high" : "medium",
      title: `${dead_stock_count} dead-stock SKU${dead_stock_count > 1 ? "s" : ""} consuming ${$(dead_stock_value)} in capital`,
      detail: `${dead_stock_count} item${dead_stock_count > 1 ? "s have" : " has"} recorded zero consumption for over ${deadStockDays} days and ${dead_stock_count > 1 ? "are" : "is"} classified as dead stock. ${deadPct}% of the portfolio is affected, showing no recorded usage while incurring an estimated ${$(dead_stock_carrying_cost)} per year in holding costs. Without liquidation or write-off action, this figure compounds annually.`,
      affected_skus: dead_stock_count,
      financial_exposure: dead_stock_value,
    });
  }

  if (slow_mover_count > 0) {
    const slowMovingDays = metrics.active_policy?.policy.slow_moving_days ?? 180;
    risks.push({
      severity: slow_mover_value > total_inventory_value * 0.20 ? "high" : "medium",
      title: `${slow_mover_count} slow-moving SKU${slow_mover_count > 1 ? "s" : ""} tying up ${$(slow_mover_value)}`,
      detail: `Based on your configured slow-moving threshold of ${slowMovingDays} days, ${slow_mover_count} item${slow_mover_count > 1 ? "s" : ""} ${slow_mover_count > 1 ? "were" : "was"} classified as slow moving. ${slowPct}% of the portfolio carries more than ${slowMovingDays} days of stock on hand. These items elevate working capital requirements and increase obsolescence exposure. Review demand, replenishment timing, and excess-stock reduction options before changing orders.`,
      affected_skus: slow_mover_count,
      financial_exposure: slow_mover_value,
    });
  }

  if (abc_summary.a_count > 0 && abc_summary.a_revenue_pct < 60) {
    risks.push({
      severity: "medium",
      title: "ABC distribution indicates sub-optimal stock prioritisation",
      detail: `A-class items represent ${abc_summary.a_revenue_pct}% of annual consumption value. Review whether replenishment attention matches this consumption concentration.`,
      affected_skus: abc_summary.a_count,
      financial_exposure: 0,
    });
  }

  // Ensure at least one risk entry
  if (risks.length === 0) {
    risks.push({
      severity: "low",
      title: "No material risks identified at this time",
      detail: "All inventory metrics are within acceptable thresholds. Continued monitoring is recommended to maintain current performance.",
      affected_skus: 0,
      financial_exposure: 0,
    });
  }

  // ── 3. Financial Impact ───────────────────────────────────────────────────────
  const annualConsumptionExposure = top_risk_items
    .filter(r => r.scenario === "CRITICAL")
    .reduce((s, r) => s + r.units_sold_30d * r.unit_price * 12, 0);

  const financialBody = buildFinancialBody(
    total_inventory_value, annual_carrying_cost, dead_stock_value,
    slow_mover_value, recoverable_capital, turnover_ratio,
    annualConsumptionExposure, dead_stock_carrying_cost
  );

  const financialMetrics = [
    { label: "Total Inventory Value",   value: $(total_inventory_value),  sub: "on-hand stock" },
    { label: "Annual Carrying Cost",    value: $(annual_carrying_cost),   sub: "25% holding rate" },
    { label: "Dead Stock Exposure",     value: $(dead_stock_value),       sub: `${$(dead_stock_carrying_cost)}/yr cost`, highlight: dead_stock_value > total_inventory_value * 0.10 },
    { label: "Slow Mover Exposure",     value: $(slow_mover_value),       sub: `${slowPct}% of portfolio`, highlight: slow_mover_value > total_inventory_value * 0.15 },
    { label: "Recoverable Capital",     value: $(recoverable_capital),    sub: "policy-based estimate", highlight: recoverable_capital > 0 },
    { label: "Inventory Turnover",      value: `${turnover_ratio}×`,      sub: "snapshot estimate; context dependent" },
    ...(annualConsumptionExposure > 0
      ? [{ label: "Annual Consumption Exposure", value: $(annualConsumptionExposure), sub: "annualised", highlight: true }]
      : []),
  ];

  // ── 4. Recommended Actions ────────────────────────────────────────────────────
  const actions: RecommendedAction[] = buildActions(
    critical_stockout_count, stockout_risk_count, dead_stock_count,
    slow_mover_count, reorder_count, recoverable_capital,
    dead_stock_value, abc_summary, turnover_ratio
  );

  // ── 5. Priority Items ─────────────────────────────────────────────────────────
  const priorityItems: PriorityItem[] = top_risk_items.slice(0, 8).map(sku => ({
    sku_id: sku.sku_id,
    product_name: sku.product_name,
    scenario: sku.scenario,
    abc_class: sku.abc_class,
    urgency_label:
      sku.scenario === "CRITICAL" ? "Review replenishment" :
      sku.scenario === "DEAD"     ? "Review disposition" :
      sku.scenario === "SLOW"     ? "Review excess stock" : "Review",
    action_label:
      sku.scenario === "CRITICAL" ? `Calculated EOQ: ${sku.reorder_qty_eoq} units` :
      sku.scenario === "DEAD"     ? "Review disposition options" :
      sku.scenario === "SLOW"     ? "Review demand and replenishment" : "Monitor",
    value: sku.inventory_value,
    days_left: isFinite(sku.days_stock_remaining) ? Math.floor(sku.days_stock_remaining) : null,
  }));

  // ── Audience notes ────────────────────────────────────────────────────────────
  const audienceNotes = buildAudienceNotes(
    status, health_score, recoverable_capital, critical_stockout_count,
    dead_stock_count, reorder_count, turnover_ratio
  );

  return {
    generated_at: new Date().toISOString(),
    health_overview: {
      headline: overviewHeadlines[status],
      status,
      score: health_score,
      body: overviewBody,
      signal: scoreSignal(health_score),
    },
    key_risks: risks,
    financial_impact: {
      headline: `${$(total_inventory_value)} portfolio · ${$(recoverable_capital)} estimated recoverable · ${$(annual_carrying_cost)}/yr holding cost`,
      body: financialBody,
      metrics: financialMetrics,
    },
    recommended_actions: actions,
    priority_items: priorityItems,
    audience_notes: audienceNotes,
    data_completeness: (() => {
      if (detectedFields.length === 0) return undefined;
      const c = computeCompleteness(detectedFields);
      const note = c.score >= 86
        ? "Your dataset provides complete analytical coverage. All insights are fully available."
        : c.score >= 61
        ? `Your dataset covers ${c.score}% of analytical dimensions. Adding ${c.missing_advice.slice(0,2).map(a => a.field.label).join(" and ")} would unlock additional strategic insights.`
        : c.score >= 31
        ? `With ${c.score}% data completeness, analysis is limited to ${c.current_capabilities.slice(0,3).join(", ")}. Enriching the dataset with operational fields (${c.missing_advice.slice(0,2).map(a => a.field.label).join(", ")}) would significantly improve decision support.`
        : `Basic analysis only (${c.score}% completeness). To unlock inventory health scoring, financial analysis, and reorder recommendations, add monthly usage, unit cost, and lead time data.`;
      return {
        score: c.score,
        tier_label: c.tier_label,
        tier_color: c.tier_color,
        missing_fields: c.missing_advice.slice(0, 5).map(a => ({ label: a.field.label, unlocks: a.unlocks })),
        note,
      };
    })(),
  };
}

// ── Prose builders ─────────────────────────────────────────────────────────────

function buildOverviewBody(
  status: string, score: number, total: number,
  deadPct: number, slowPct: number, riskPct: number,
  turnover: number, aCount: number, aRevPct: number,
  totalValue: number, recoverable: number
): string {
  // Lead with the highest-impact dollar figure so the first sentence commands attention
  const recoverableStr = $(recoverable);
  const totalStr = $(totalValue);
  const opening: Record<string, string> = {
    Excellent: `This inventory portfolio has ${recoverableStr} in estimated recoverable capital and scores ${score}/100 — a strong result reflecting well-optimised stock levels, minimal waste, and high service availability.`,
    Good:      `Analysis identified ${recoverableStr} in estimated recoverable capital across a ${totalStr} portfolio scoring ${score}/100. Operations are generally sound with specific areas requiring targeted attention.`,
    Fair:      `This ${totalStr} portfolio has ${recoverableStr} in estimated recoverable capital currently tied up in inefficiencies, creating potential working-capital pressure. The ${score}/100 health score reflects material gaps across multiple dimensions.`,
    Poor:      `Executive review is warranted: ${recoverableStr} in capital is tied to dead stock and slow movers within a ${totalStr} portfolio scoring ${score}/100. This level of inefficiency may indicate a systemic risk to operational continuity and balance sheet health.`,
  };

  const lines: string[] = [opening[status]];

  if (deadPct > 0) {
    lines.push(`${deadPct}% of SKUs (${Math.round(total * deadPct / 100)}) carry zero monthly usage and are classified as dead stock, representing trapped capital that erodes carrying-cost efficiency.`);
  }
  if (slowPct > 0) {
    lines.push(`A further ${slowPct}% of the portfolio is moving below the 6-month velocity threshold, indicating excess accumulation relative to current demand signals.`);
  }
  if (riskPct > 0) {
    lines.push(`${riskPct}% of SKUs are at elevated stockout risk and may affect fulfilment continuity and service performance.`);
  }
  if (deadPct === 0 && slowPct === 0 && riskPct === 0) {
    lines.push(`No dead stock, slow movers, or stockout risk has been identified. The portfolio is operating cleanly within defined thresholds.`);
  }

  lines.push(`ABC classification shows ${aCount} A-class items accounting for ${aRevPct}% of inventory value. Inventory turnover of ${turnover}x is a snapshot estimate to interpret against company targets, history and relevant industry context.`);

  if (recoverable > 0) {
    lines.push(`An estimated ${$(recoverable)} in recoverable capital may be available through disposition or reduction options for dead stock and slow-mover excess.`);
  }

  return lines.join(" ");
}

function buildFinancialBody(
  totalValue: number, carrying: number, deadValue: number,
  slowValue: number, recoverable: number, turnover: number,
  consumptionExposure: number, deadCarrying: number
): string {
  const lines: string[] = [];

  lines.push(`The on-hand inventory portfolio is valued at ${$(totalValue)}, generating an estimated ${$(carrying)} in annual holding costs at a standard 25% carrying rate.`);

  const illiquid = deadValue + slowValue;
  const illiquidPct = totalValue > 0 ? Math.round((illiquid / totalValue) * 100) : 0;
  if (illiquid > 0) {
    lines.push(`${$(illiquid)} (${illiquidPct}% of total inventory value) is classified as either dead or slow-moving, contributing ${$(deadCarrying)} per year in unproductive carrying costs.`);
  }

  if (recoverable > 0) {
    lines.push(`Through reviewed disposition and demand-driven reorder reductions, management has an estimated ${$(recoverable)} in recoverable working capital to assess.`);
  }

  if (consumptionExposure > 0) {
    lines.push(`Critical stockout conditions present an estimated ${$(consumptionExposure)} in annualised consumption exposure, based on current usage across affected SKUs.`);
  }

  lines.push(`Inventory turnover of ${turnover}x is a snapshot estimate based on annualised consumption and current inventory value. Interpret it against company targets, historical trend and relevant industry context.`);

  return lines.join(" ");
}

function buildActions(
  criticalCount: number, riskCount: number, deadCount: number,
  slowCount: number, reorderCount: number, recoverable: number,
  deadValue: number, abc: { a_count: number; a_revenue_pct: number },
  turnover: number
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  let priority = 1;

  if (criticalCount > 0) {
    actions.push({
      priority: priority++,
      action: `Review replenishment parameters for ${criticalCount} critical-stockout SKU${criticalCount > 1 ? "s" : ""}`,
      rationale: `${criticalCount} item${criticalCount > 1 ? "s" : ""} will reach zero stock before the next replenishment cycle. Delay may increase stockout exposure and potential fulfilment impact.`,
      timeline: "Immediate",
      owner: "Procurement",
      estimated_impact: "Reduces stockout exposure based on current usage and lead time",
    });
  }

  if (riskCount > criticalCount) {
    actions.push({
      priority: priority++,
      action: `Review reorder timelines for ${riskCount - criticalCount} at-risk SKU${riskCount - criticalCount > 1 ? "s" : ""}`,
      rationale: "Items within 1.5× lead-time coverage are close to entering the critical tier. Verifying reorder timing now can reduce reliance on expedited replenishment later.",
      timeline: "This week",
      owner: "Procurement",
      estimated_impact: "Reduces escalation risk and avoids premium freight costs",
    });
  }

  if (deadCount > 0) {
    actions.push({
      priority: priority++,
      action: `Review disposition options for ${deadCount} dead-stock SKU${deadCount > 1 ? "s" : ""}`,
      rationale: `${$(deadValue)} in zero-velocity inventory is accruing holding costs with no recorded usage offset. Disposition options such as clearance, return-to-vendor, redeployment, or write-off may reduce space and working-capital pressure.`,
      timeline: "This month",
      owner: "Finance",
      estimated_impact: `Estimated recoverable capital under policy assumptions: ${$(recoverable)}`,
    });
  }

  if (slowCount > 0) {
    actions.push({
      priority: priority++,
      action: `Review excess-stock options for ${slowCount} slow-moving SKU${slowCount > 1 ? "s" : ""}`,
      rationale: "Items above the active slow-moving threshold may be tying up capital. Review demand, stock coverage and future requirements before changing replenishment settings.",
      timeline: "This month",
      owner: "Operations",
      estimated_impact: "Reduces slow-mover carrying costs and improves turnover ratio",
    });
  }

  if (abc.a_revenue_pct < 65) {
    actions.push({
      priority: priority++,
      action: "Review purchasing attention for A-class annual-consumption drivers",
      rationale: `A-items currently represent ${abc.a_revenue_pct}% of inventory value — below the 65–70% Pareto ideal. Review whether replenishment attention and stocking policy match consumption concentration.`,
      timeline: "Next quarter",
      owner: "Supply Chain",
      estimated_impact: "Improves fill rates on high-value SKUs and ABC health score",
    });
  }

  return actions;
}

function buildAudienceNotes(
  status: string, score: number, recoverable: number,
  critical: number, dead: number, reorders: number, turnover: number
): { ceo: string; supply_chain: string; procurement: string } {
  return {
    ceo: [
      `Inventory health is rated ${status} at ${score}/100.`,
      recoverable > 0
        ? `There is ${$(recoverable)} in estimated recoverable capital that is policy-based and should be reviewed through disposition and replenishment decisions.`
        : "No immediate capital recovery opportunities exist at this time.",
      score < 60
        ? "The breadth of issues identified suggests a systemic process gap. A cross-functional inventory governance review is recommended."
        : "No structural intervention is required at this stage.",
    ].join(" "),

    supply_chain: [
      critical > 0
        ? `${critical} SKU${critical > 1 ? "s require" : " requires"} replenishment review to reduce fulfilment risk.`
        : "No critical stockout conditions are active.",
      reorders > 0
        ? `${reorders} replenishment recommendation${reorders > 1 ? "s" : ""} should be reviewed this week.`
        : "",
      `Inventory turnover is ${turnover}x, a snapshot estimate to compare against company targets and trend.`,
      dead > 0
        ? `${dead} dead-stock SKU${dead > 1 ? "s are" : " is"} a priority for space and cost recovery.`
        : "",
    ].filter(Boolean).join(" "),

    procurement: [
      critical > 0
        ? `Review replenishment parameters and recent purchasing decisions for ${critical} critical SKU${critical > 1 ? "s" : ""}.`
        : "No emergency purchasing is required at this time.",
      reorders > 0
        ? `Review EOQ-based reorder quantities for ${reorders} items flagged in the reorder queue.`
        : "",
      dead > 0
        ? "Review replenishment for dead-stock SKUs where appropriate and review disposition options."
        : "",
      "Align replenishment parameters to the ABC classification and review service exposure for A-class items.",
    ].filter(Boolean).join(" "),
  };
}





