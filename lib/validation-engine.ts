/**
 * Validation Engine — Phase 13: Explainable Analytics & Trust Framework
 *
 * Provides:
 *  - buildLiveCalculation() — step-by-step real-data computations for each KPI
 *  - getWhyExplanation()    — plain-English "why am I seeing this?" per KPI
 *  - getDataLineage()       — source columns + policy info per KPI
 *  - buildScoreBreakdown()  — health-score decomposition from 100 down
 *  - buildValidationExport() — full audit payload for download
 */

import { formatCurrency } from "@/lib/utils";
import type { DashboardMetrics } from "@/lib/types";
import type { KPIKey } from "@/lib/kpi-definitions";
import type { ActivePolicy } from "@/lib/policy";
import { getHealthFormula, getHealthScoreContributions } from "@/lib/health-score";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LiveCalcStep {
  label: string;
  expr?: string;          // formula expression (monospace)
  value: string;          // computed value
  detail?: string;        // extra context
  isFinal?: boolean;      // highlight as the result row
  isHeader?: boolean;     // section divider label
}

export interface LiveCalculation {
  totalRecords: number;
  includedRecords: number;
  summary: string;
  steps: LiveCalcStep[];
}

export interface WhyExplanation {
  headline: string;       // 1-line bold headline
  body: string;           // 2–3 sentence plain-English explanation
  impact: string;         // business impact
  action: string;         // recommended action
  confidence: "High" | "Medium" | "Low";
  audience: string[];     // roles this matters to
}

export interface DataLineageField {
  columnName: string;
  displayName?: string;
  role: string;
  required: boolean;
  detected: boolean;      // was it found in the uploaded file?
}

export interface DataLineage {
  source: string;
  fields: DataLineageField[];
  policySource: "file" | "user" | "system";
  policyFields: { field: string; value: string | number; source: string }[];
  assumptions: { label: string; value: string }[];
  derivedValues: { label: string; value: string }[];
  trustStatement: string;
}

export interface ScoreDeduction {
  factor: string;
  weight: number;
  rawScore: number;
  contribution: number;   // raw contribution to final score
  deduction: number;      // points lost vs perfect
  detail: string;
}

export interface ScoreBreakdown {
  baseScore: 100;
  finalScore: number;
  deductions: ScoreDeduction[];
  formula: string;
}

// ── Live Calculation Builder ──────────────────────────────────────────────────

export function buildLiveCalculation(
  key: KPIKey,
  metrics: DashboardMetrics
): LiveCalculation {
  switch (key) {

    case "inventory_value": {
      const allSkus = metrics.all_skus ?? metrics.top_risk_items;
      const sample = [...allSkus]
        .sort((a, b) => b.inventory_value - a.inventory_value)
        .slice(0, 5);
      const steps: LiveCalcStep[] = [
        { label: "Formula applied per SKU", expr: "SKU Value = Units on Hand × Unit Cost", value: "" },
        { isHeader: true, label: "Top 5 contributors", value: "" },
        ...sample.map((s) => ({
          label: `${s.product_name} (${s.sku_id})`,
          expr: `${s.units_on_hand.toLocaleString()} units × ${formatCurrency(s.unit_cost)}`,
          value: formatCurrency(s.inventory_value),
        })),
        { isHeader: true, label: "Portfolio total", value: "" },
        {
          label: `Sum across all ${metrics.total_skus} SKUs`,
          expr: "Σ (Units × Unit Cost)",
          value: formatCurrency(metrics.total_inventory_value),
          isFinal: true,
        },
        {
          label: "Annual carrying cost (25% of value)",
          expr: `${formatCurrency(metrics.total_inventory_value)} × 0.25`,
          value: formatCurrency(metrics.annual_carrying_cost),
          detail: "Standard industry carrying cost rate",
        },
      ];
      return {
        totalRecords: metrics.total_skus,
        includedRecords: metrics.total_skus,
        summary: `Calculated from all ${metrics.total_skus} SKUs in the uploaded file`,
        steps,
      };
    }

    case "dead_stock": {
      const deadItems = metrics.all_skus
        ? metrics.all_skus.filter((s) => s.is_dead_stock)
        : metrics.top_dead_stock;
      const sample = deadItems.slice(0, 5);
      const policy = metrics.active_policy?.policy;
      const thresholdDays = policy?.dead_stock_days ?? 365;
      const fallbackActive = deadItems.some((s) => s.dead_stock_method === "zero_usage_fallback");
      const steps: LiveCalcStep[] = [
        {
          label: fallbackActive ? "Potential Dead Stock fallback" : "Movement-history method",
          expr: `daily_velocity = 0 AND days_since_last_sale ≥ ${thresholdDays} days`,
          value: "",
          detail: `Threshold: ${thresholdDays} days (${thresholdDays >= 365 ? "system default" : "policy override"})`,
        },
        { isHeader: true, label: "Sample dead stock items", value: "" },
        ...sample.map((s) => ({
          label: `${s.product_name} (${s.sku_id})`,
          expr: `${s.units_on_hand} units × ${formatCurrency(s.unit_cost)}`,
          value: formatCurrency(s.inventory_value),
          detail: `No movement for ${s.days_since_last_sale} days`,
        })),
        { isHeader: true, label: "Totals", value: "" },
        { label: "Dead stock SKUs", value: String(metrics.dead_stock_count), expr: "COUNT(is_dead_stock = true)" },
        {
          label: "Total dead stock value",
          expr: "Σ (Units × Unit Cost) for dead items",
          value: formatCurrency(metrics.dead_stock_value),
          isFinal: true,
        },
      ];
      steps[0] = {
        label: fallbackActive ? "Potential Dead Stock fallback" : "Movement-history method",
        expr: fallbackActive
          ? "stock_qty > 0 AND monthly_usage = 0"
          : `stock_qty > 0 AND days_since_last_movement >= ${thresholdDays} days`,
        value: "",
        detail: fallbackActive
          ? "Movement history was not supplied, so no inactivity-day claim is made."
          : `Active dead-stock threshold: ${thresholdDays} days`,
      };
      return {
        totalRecords: metrics.total_skus,
        includedRecords: metrics.dead_stock_count,
        summary: fallbackActive ? `${metrics.dead_stock_count} of ${metrics.total_skus} SKUs classified using the zero-usage fallback method` : `${metrics.dead_stock_count} of ${metrics.total_skus} SKUs classified using the ${thresholdDays}-day movement-history threshold`,
        steps,
      };
    }

    case "slow_moving": {
      const slowItems = metrics.all_skus
        ? metrics.all_skus.filter((s) => s.is_slow_mover && !s.is_dead_stock)
        : metrics.top_risk_items.filter((s) => s.scenario === "SLOW");
      const sample = slowItems.slice(0, 5);
      const policy = metrics.active_policy?.policy;
      const thresholdDays = policy?.slow_moving_days ?? 180;
      const steps: LiveCalcStep[] = [
        {
          label: "Classification rule",
          expr: `daily_usage > 0 AND days_of_supply > ${thresholdDays} days AND NOT dead_stock`,
          value: "",
          detail: `Active slow-moving threshold: ${thresholdDays} days`,
        },
        {
          label: "Daily usage",
          expr: "daily_usage = monthly_usage / 30",
          value: "",
          detail: "monthly_usage means units consumed, issued or sold during a typical 30-day period",
        },
        { isHeader: true, label: "Sample slow-moving items", value: "" },
        ...sample.map((s) => ({
          label: `${s.product_name} (${s.sku_id})`,
          expr: `${s.units_on_hand} units, ${isFinite(s.days_stock_remaining) ? Math.round(s.days_stock_remaining) + "d supply" : "∞ supply"}`,
          value: formatCurrency(s.inventory_value),
        })),
        { isHeader: true, label: "Totals", value: "" },
        { label: "Slow-moving SKUs", value: String(metrics.slow_mover_count), expr: "COUNT(daily_usage > 0 AND days_of_supply > active slow_moving_days AND NOT dead_stock)" },
        {
          label: "Total slow-moving value",
          expr: "Σ (Units × Unit Cost) for slow movers",
          value: formatCurrency(metrics.slow_mover_value),
          isFinal: true,
        },
      ];
      return {
        totalRecords: metrics.total_skus,
        includedRecords: metrics.slow_mover_count,
        summary: `${metrics.slow_mover_count} SKUs classified as slow-moving (>${thresholdDays} days of supply)`,
        steps,
      };
    }

    case "stockout_risk": {
      const policy = metrics.active_policy?.policy;
      const safetyDays = policy?.safety_stock_days ?? 15;
      const atRisk = metrics.all_skus
        ? metrics.all_skus.filter(
            (s) => !s.is_dead_stock && s.daily_velocity > 0 && s.units_on_hand <= s.reorder_point_calc
          )
        : metrics.top_risk_items.filter((s) => s.scenario === "CRITICAL" || s.scenario === "WATCH");
      const sample = atRisk.slice(0, 5);
      const steps: LiveCalcStep[] = [
        {
          label: "Reorder Point formula",
          expr: "ROP = (daily_velocity × lead_time_days) + safety_stock\nsafety_stock = daily_velocity × " + safetyDays + " days",
          value: "",
        },
        {
          label: "At-risk classification",
          expr: "stock_qty ≤ ROP  AND  daily_velocity > 0  AND  NOT dead_stock",
          value: "",
        },
        { isHeader: true, label: "Sample at-risk items", value: "" },
        ...sample.map((s) => ({
          label: `${s.product_name} (${s.sku_id})`,
          expr: `${s.units_on_hand} on hand ≤ ROP ${Math.round(s.reorder_point_calc)}, ${isFinite(s.days_stock_remaining) ? Math.round(s.days_stock_remaining) + "d stock" : "—"}`,
          value: s.units_on_hand <= (s.reorder_point_calc * 0.5) ? "⚠ Critical" : "Watch",
          detail: `Lead time: ${s.lead_time_days}d, velocity: ${s.daily_velocity.toFixed(2)} units/day`,
        })),
        { isHeader: true, label: "Summary", value: "" },
        {
          label: "SKUs at stockout risk",
          expr: "COUNT(stock_qty ≤ ROP)",
          value: String(metrics.stockout_risk_count),
          isFinal: true,
        },
        {
          label: "Critical (< 50% of ROP)",
          value: String(metrics.critical_stockout_count),
        },
      ];
      return {
        totalRecords: metrics.total_skus,
        includedRecords: metrics.stockout_risk_count,
        summary: `${metrics.stockout_risk_count} SKUs have stock at or below reorder point`,
        steps,
      };
    }

    case "health_score": {
      const factors = getHealthScoreContributions(metrics);
      const steps: LiveCalcStep[] = [
        { isHeader: true, label: "Factor scores and active policy weights", value: "" },
        ...factors.map((factor) => ({
          label: factor.label,
          expr: `${factor.score} x ${(factor.weight / 100).toFixed(2)} = ${factor.exactContribution.toFixed(2)}`,
          value: `+${factor.displayedContribution} pts`,
          detail: factor.detail,
        })),
        { isHeader: true, label: "Composite formula", value: "" },
        {
          label: "Weighted average",
          expr: getHealthFormula(metrics),
          value: String(metrics.health_score),
          detail: `Displayed contributions sum to ${metrics.health_score}`,
          isFinal: true,
        },
      ];
      return {
        totalRecords: metrics.total_skus,
        includedRecords: metrics.total_skus,
        summary: "Composite score from active InventoryPolicy health weights",
        steps,
      };
    }
    case "abc_analysis": {
      const abc = metrics.abc_summary;
      const aItems = metrics.all_skus
        ? metrics.all_skus.filter((s) => s.abc_class === "A").slice(0, 5)
        : metrics.top_risk_items.filter((s) => s.abc_class === "A").slice(0, 5);
      const p = metrics.active_policy?.policy;
      const aPct = p?.abc_a_pct ?? 70;
      const bPct = p?.abc_b_pct ?? 20;
      const steps: LiveCalcStep[] = [
        {
          label: "ABC classification logic",
          expr: `Rank all SKUs by annual consumption value:\nA = first ${aPct}% of cumulative value\nB = next ${bPct}% of cumulative value\nC = remaining items`,
          value: "",
        },
        { isHeader: true, label: "Classification results", value: "" },
        {
          label: "A-class items",
          expr: `${abc.a_count} SKUs representing ${abc.a_revenue_pct}% of annual consumption value`,
          value: `${abc.a_count} SKUs`,
          detail: `${Math.round((abc.a_count / metrics.total_skus) * 100)}% of SKU count`,
        },
        {
          label: "B-class items",
          expr: `${abc.b_count} SKUs representing ${abc.b_revenue_pct}% of annual consumption value`,
          value: `${abc.b_count} SKUs`,
        },
        {
          label: "C-class items",
          expr: `${abc.c_count} SKUs representing ${abc.c_revenue_pct}% of annual consumption value`,
          value: `${abc.c_count} SKUs`,
          isFinal: true,
        },
        { isHeader: true, label: "Top A-class items", value: "" },
        ...aItems.map((s) => ({
          label: `${s.product_name} (${s.sku_id})`,
          value: formatCurrency(s.inventory_value),
          detail: `A-class · ${s.scenario}`,
        })),
      ];
      return {
        totalRecords: metrics.total_skus,
        includedRecords: metrics.total_skus,
        summary: `${abc.a_count} A-items represent ${abc.a_revenue_pct}% of annual consumption value`,
        steps,
      };
    }

    case "turnover_ratio": {
      const steps: LiveCalcStep[] = [
        {
          label: "Estimated turnover formula",
          expr: "Annualised Consumption Cost = SUM(monthly_usage * 12 * unit_cost)\\nCurrent Inventory Value = SUM(stock_qty * unit_cost)\\nEstimated Inventory Turnover = Annualised Consumption Cost / Current Inventory Value\\nEstimated Days of Inventory = 365 / Estimated Inventory Turnover",
          value: "",
        },
        {
          label: "Estimated Inventory Turnover",
          expr: `Annualised Consumption Cost / Current Inventory Value`,
          value: `${metrics.turnover_ratio.toFixed(2)}×`,
          isFinal: true,
          detail: "Snapshot estimate. Interpret against company targets, historical trend and relevant industry context.",
        },
        
      ];
      return {
        totalRecords: metrics.total_skus,
        includedRecords: metrics.total_skus,
        summary: `Estimated inventory turnover is ${metrics.turnover_ratio.toFixed(2)}x based on annualised consumption and current inventory value`,
        steps,
      };
    }

    case "recoverable_capital": {
      const steps: LiveCalcStep[] = [
        {
          label: "Recoverable capital components",
          expr: "Non-performing value = Dead Stock Value + Slow Moving Value; Estimated Recovery = Dead Recovery + Slow Excess Recovery",
          value: "",
        },
        {
          label: "Dead stock component",
          expr: `${metrics.dead_stock_count} dead stock SKUs`,
          value: formatCurrency(metrics.dead_stock_value),
        },
        {
          label: "Slow-moving component",
          expr: `${metrics.slow_mover_count} slow-moving SKUs`,
          value: formatCurrency(metrics.slow_mover_value),
        },
        {
          label: "Estimated recoverable capital",
          expr: `${formatCurrency(metrics.dead_stock_value)} + ${formatCurrency(metrics.slow_mover_value)}`,
          value: formatCurrency(metrics.recoverable_capital),
          isFinal: true,
          detail: `= ${((metrics.recoverable_capital / metrics.total_inventory_value) * 100).toFixed(1)}% of total inventory value`,
        },
      ];
      return {
        totalRecords: metrics.total_skus,
        includedRecords: metrics.dead_stock_count + metrics.slow_mover_count,
        summary: `Capital tied up in non-performing stock`,
        steps,
      };
    }

    case "reorder_count": {
      const recs = metrics.reorder_recommendations;
      const immediate = recs.filter((r) => r.urgency === "immediate").length;
      const thisWeek = recs.filter((r) => r.urgency === "this_week").length;
      const steps: LiveCalcStep[] = [
        {
          label: "Reorder triggered when",
          expr: "stock_qty ≤ ROP  AND  daily_velocity > 0  AND  lead_time_days > 0",
          value: "",
        },
        { isHeader: true, label: "By urgency", value: "" },
        { label: "Immediate (stockout imminent)", value: String(immediate), detail: "< 7 days remaining" },
        { label: "This week", value: String(thisWeek), detail: "7–14 days remaining" },
        { label: "This month", value: String(recs.length - immediate - thisWeek), detail: "14–30 days remaining" },
        {
          label: "Total reorder recommendations",
          value: String(metrics.reorder_count),
          isFinal: true,
          expr: "COUNT(items requiring reorder)",
        },
      ];
      return {
        totalRecords: metrics.total_skus,
        includedRecords: metrics.reorder_count,
        summary: `${metrics.reorder_count} SKUs have fallen to or below their reorder point`,
        steps,
      };
    }

    default:
      return {
        totalRecords: metrics.total_skus,
        includedRecords: 0,
        summary: "Calculation details not available for this KPI.",
        steps: [],
      };
  }
}

// ── Plain-English "Why am I seeing this?" ────────────────────────────────────

export function getWhyExplanation(
  key: KPIKey,
  metrics: DashboardMetrics
): WhyExplanation {
  const hc = metrics.health_components;

  switch (key) {

    case "health_score": {
      const factors = getHealthScoreContributions(metrics);
      const weakest = factors
        .filter((factor) => factor.weight > 0 && !factor.isNeutral)
        .sort((a, b) => a.score - b.score)[0];
      return {
        headline: `Health Score is ${metrics.health_score}/100 using active policy weights`,
        body: `The score is the weighted sum of the displayed factor scores and active InventoryPolicy weights. ${weakest ? `${weakest.label} is the weakest active contributor at ${weakest.score}/100 and ${weakest.weight}% weight.` : "No active weighted factor is currently under pressure."} ABC profile is informational when its active weight is 0, so normal Pareto concentration is not penalised.`,
        impact: `The displayed weighted contributions sum to ${metrics.health_score}, so there are no hidden overrides or undocumented adjustments.`,
        action: weakest ? `Focus first on ${weakest.label.toLowerCase()} because it has the lowest active component score.` : "Monitor the active factors and keep policy weights reviewed.",
        confidence: "High",
        audience: ["CEO", "Finance Manager", "Supply Chain Manager", "Procurement"],
      };
    }
    case "abc_analysis": {
      const abc = metrics.abc_summary;
      return {
        headline: `${abc.a_count} A-class items drive ${abc.a_revenue_pct}% of your annual consumption value`,
        body: `ABC analysis ranks every item by its contribution to total inventory value. A-class items (${abc.a_count} SKUs, ${Math.round((abc.a_count / metrics.total_skus) * 100)}% of your range) account for ${abc.a_revenue_pct}% of value. B-class items (${abc.b_count} SKUs) account for ${abc.b_revenue_pct}%, and C-class (${abc.c_count} SKUs) account for the rest.`,
        impact: `Mismanaging A-class items — either by stocking out or over-ordering — has an outsized financial impact. B and C items offer opportunities to reduce carrying cost without significant annual consumption value risk.`,
        action: `Apply tighter reorder policies and shorter review cycles to A-class items. For C-class items, consider rationalising the range — eliminating slow-sellers reduces complexity and frees capital for high-performers.`,
        confidence: "High",
        audience: ["CEO", "Finance Manager", "Procurement"],
      };
    }

    case "inventory_value": {
      return {
        headline: `Your total inventory is valued at ${formatCurrency(metrics.total_inventory_value)}`,
        body: `This is the sum of (units on hand × unit cost) for all ${metrics.total_skus} SKUs in your uploaded file. It represents the total capital currently locked in physical stock. The annual carrying cost — storage, insurance, obsolescence, and capital cost — is estimated at ${formatCurrency(metrics.annual_carrying_cost)} (25% of inventory value, standard industry rate).`,
        impact: `Every dollar of inventory that is not generating sales is incurring carrying costs. ${formatCurrency(metrics.recoverable_capital)} (${((metrics.recoverable_capital / metrics.total_inventory_value) * 100).toFixed(0)}% of total value) is in dead or slow-moving stock.`,
        action: `Compare your inventory value to monthly consumption cost to assess turns. If inventory exceeds 3 months of cost of goods sold, there is likely over-stocking that warrants a buying freeze on slow categories.`,
        confidence: "High",
        audience: ["CEO", "Finance Manager"],
      };
    }

    case "turnover_ratio": {
      const turns = metrics.turnover_ratio;
      return {
        headline: `Estimated inventory turnover is ${turns.toFixed(1)}x`,
        body: "Turnover is a snapshot estimate based on annualised consumption and current inventory value. Interpret it against the company\'s own targets, historical trend and relevant industry context.",
        impact: "Low turnover may indicate excess stock, slower demand, long replenishment cycles, strategic buffers or product-mix effects. Review supporting inventory records before concluding the cause.",
        action: "Improving turnover may reduce capital tied up in inventory, but the financial impact depends on demand, service requirements and the amount of inventory safely reducible.",
        confidence: "Medium",
        audience: ["CEO", "Finance Manager", "Supply Chain Manager"],
      };
    }

    case "recoverable_capital": {
      return {
        headline: `${formatCurrency(metrics.recoverable_capital)} is locked in non-performing stock`,
        body: `This figure combines dead stock (${formatCurrency(metrics.dead_stock_value)} across ${metrics.dead_stock_count} SKUs) and slow-moving inventory (${formatCurrency(metrics.slow_mover_value)} across ${metrics.slow_mover_count} SKUs). These items are generating little or no annual consumption value and are actively costing money through carrying costs.`,
        impact: `If even 30% of this capital were recovered through liquidation or write-downs, it could free ${formatCurrency(metrics.recoverable_capital * 0.3)} for investment in faster-moving stock, reducing carrying costs and improving cash flow.`,
        action: `Prioritise dead stock for immediate action (liquidation, return to supplier, or write-off). For slow movers, a targeted clearance promotion often recovers 40–60% of book value while freeing shelf space.`,
        confidence: "High",
        audience: ["CEO", "Finance Manager"],
      };
    }

    case "reorder_count": {
      return {
        headline: `${metrics.reorder_count} items need to be reordered now`,
        body: `These items have stock levels at or below their calculated reorder point. The reorder point is the minimum stock needed to cover expected demand during the supplier delivery lead time, plus a safety buffer. Waiting longer increases the risk of stockouts.`,
        impact: `The ${metrics.critical_stockout_count} critical items are most urgent — their stock may be exhausted before the next scheduled delivery. Expedite cost and service impact depend on supplier and customer context.`,
        action: `Export the purchase order draft from the dashboard and send to your procurement team today. Prioritise items marked "Immediate" — they require same-day action.`,
        confidence: "High",
        audience: ["Procurement", "Supply Chain Manager", "Operations"],
      };
    }

    default:
      return {
        headline: "Analytics explanation",
        body: "This metric is calculated directly from your uploaded inventory data.",
        impact: "Monitor this value regularly as part of your inventory management routine.",
        action: "Review the Formula and Supporting Data tabs for full calculation details.",
        confidence: "Medium",
        audience: ["Supply Chain Manager"],
      };
  }
}

// ── Data Lineage ──────────────────────────────────────────────────────────────

const FIELD_MAP: Record<KPIKey, { column: string; displayName?: string; role: string; required: boolean }[]> = {
  inventory_value: [
    { column: "units_on_hand", role: "Stock quantity",   required: true },
    { column: "unit_cost",     role: "Per-unit cost",    required: true },
  ],
  dead_stock: [
    { column: "units_on_hand",      role: "Stock quantity",     required: true },
    { column: "unit_cost",          role: "Per-unit cost",      required: true },
    { column: "last_movement_date", role: "Days-since-sale",    required: false },
    { column: "monthly_usage",      role: "Sales velocity",     required: true },
  ],
  slow_moving: [
    { column: "units_on_hand",  role: "Stock quantity",  required: true },
    { column: "monthly_usage",  role: "Units consumed, issued or sold during a typical 30-day period",  required: true },
    { column: "unit_cost",      role: "Per-unit cost",   required: true },
  ],
  stockout_risk: [
    { column: "units_on_hand",  role: "Stock quantity",  required: true },
    { column: "monthly_usage",  role: "Units consumed, issued or sold during a typical 30-day period",  required: true },
    { column: "lead_time",      role: "Supplier lead time", required: false },
    { column: "unit_cost",      role: "Per-unit cost",   required: false },
  ],
  health_score: [
    { column: "units_on_hand",  role: "Stock quantity",  required: true },
    { column: "monthly_usage",  role: "Units consumed, issued or sold during a typical 30-day period",  required: true },
    { column: "unit_cost",      role: "Per-unit cost",   required: true },
    { column: "lead_time",      role: "Supplier lead time", required: false },
  ],
  abc_analysis: [
    { column: "units_on_hand",  role: "Stock quantity",  required: true },
    { column: "unit_cost",      role: "Per-unit cost",   required: true },
  ],
  turnover_ratio: [
    { column: "units_on_hand",  role: "Stock quantity",  required: true },
    { column: "unit_cost",      role: "Per-unit cost",   required: true },
    { column: "monthly_usage",  displayName: "Monthly Usage", role: "Units consumed, issued or sold during a typical 30-day period.",  required: true },
  ],
  recoverable_capital: [
    { column: "units_on_hand",  role: "Stock quantity",  required: true },
    { column: "unit_cost",      role: "Per-unit cost",   required: true },
    { column: "monthly_usage",  role: "Units consumed, issued or sold during a typical 30-day period",  required: true },
  ],
  reorder_count: [
    { column: "units_on_hand",  role: "Stock quantity",  required: true },
    { column: "monthly_usage",  role: "Units consumed, issued or sold during a typical 30-day period",  required: true },
    { column: "lead_time",      role: "Supplier lead time", required: true },
  ],
  ageing_score: [
    { column: "ageing_days",        role: "Direct days since last movement when supplied", required: false },
    { column: "last_movement_date", role: "Used to derive ageing days when direct ageing is not supplied", required: false },
    { column: "units_on_hand",      role: "Stock quantity",           required: true },
    { column: "unit_cost",          role: "Per-unit cost",            required: false },
  ],
  blocked_capital: [
    { column: "units_on_hand",  role: "Stock quantity",  required: true },
    { column: "unit_cost",      role: "Per-unit cost",   required: true },
    { column: "ageing_days",    role: "Direct ageing days when supplied", required: false },
    { column: "last_movement_date", role: "Used to derive ageing days when direct ageing is not supplied", required: false },
  ],
  avg_ageing_days: [
    { column: "ageing_days",    role: "Direct days since last movement when supplied", required: false },
    { column: "last_movement_date", role: "Used to derive ageing days when direct ageing is not supplied", required: false },
    { column: "units_on_hand",  role: "Stock quantity",           required: false },
  ],
};

export function getDataLineage(
  key: KPIKey,
  detectedFields: string[],
  activePolicy?: ActivePolicy | null
): DataLineage {
  const fields = (FIELD_MAP[key] ?? []).map((f) => ({
    columnName: f.column,
    displayName: f.displayName,
    role: f.role,
    required: f.required,
    detected: detectedFields.some(
      (d) => d.toLowerCase().includes(f.column.toLowerCase().replace(/_/g, " ").split(" ")[0])
    ),
  }));

  const policy = activePolicy?.policy;
  const sources = activePolicy?.field_sources ?? {};
  const policySource = activePolicy?.source ?? "system";

  const policyFields: DataLineage["policyFields"] = [];
  const assumptions: DataLineage["assumptions"] = [];
  const derivedValues: DataLineage["derivedValues"] = [];
  if (policy) {
    const policyByKpi: Partial<Record<KPIKey, Array<{ field: keyof typeof policy; label: string; suffix?: string }>>> = {
      dead_stock: [{ field: "dead_stock_days", label: "Dead stock threshold", suffix: " days" }],
      slow_moving: [{ field: "slow_moving_days", label: "Slow moving threshold", suffix: " days" }],
      stockout_risk: [{ field: "safety_stock_days", label: "Safety stock days", suffix: " days" }],
      reorder_count: [{ field: "safety_stock_days", label: "Safety stock days", suffix: " days" }],
      abc_analysis: [
        { field: "abc_a_pct", label: "ABC A-class threshold", suffix: "%" },
        { field: "abc_b_pct", label: "ABC B-class threshold", suffix: "%" },
      ],
      health_score: [
        { field: "weight_dead_stock", label: "Dead stock weight", suffix: "%" },
        { field: "weight_slow_moving", label: "Slow moving weight", suffix: "%" },
        { field: "weight_stockout_risk", label: "Stockout risk weight", suffix: "%" },
      ],
      recoverable_capital: [
        { field: "dead_stock_recovery_rate", label: "Dead stock recovery rate", suffix: "%" },
        { field: "slow_moving_recovery_rate", label: "Slow moving recovery rate", suffix: "%" },
        { field: "target_coverage_months", label: "Target coverage", suffix: " months" },
      ],
    };
    const relevantFields = policyByKpi[key] ?? [];
    for (const { field, label, suffix = "" } of relevantFields) {
      if (policy[field] != null) {
        policyFields.push({
          field: label,
          value: `${policy[field] as number}${suffix}`,
          source: sources[field] ?? "system",
        });
      }
    }
  }

  if (key === "inventory_value") derivedValues.push({ label: "Inventory value", value: "stock_qty * unit_cost" });
  if (key === "slow_moving") derivedValues.push({ label: "Daily usage", value: "monthly_usage / 30" }, { label: "Days of supply", value: "stock_qty / daily_usage" }, { label: "Classification dependency", value: "dead_stock items are excluded" });
  if (key === "stockout_risk" || key === "reorder_count") derivedValues.push({ label: "Safety stock", value: "daily_usage * safety_stock_days" }, { label: "Reorder point", value: "lead-time demand + safety stock" });
  if (key === "abc_analysis") derivedValues.push({ label: "Annual consumption value", value: "monthly_usage * 12 * unit_cost" });
  if (key === "turnover_ratio") {
    assumptions.push({ label: "Annualisation", value: "Monthly usage multiplied by 12" }, { label: "Days conversion", value: "365 / turnover" });
    derivedValues.push({ label: "Annualised consumption cost", value: "sum(monthly_usage * 12 * unit_cost)" });
  }
  if (key === "ageing_score" || key === "blocked_capital" || key === "avg_ageing_days") {
    derivedValues.push({ label: "Ageing source", value: "ageing_days used directly when present; otherwise derived from last_movement_date" });
  }
  if (key === "recoverable_capital") assumptions.push({ label: "Recovery rates", value: "Policy assumptions, not uploaded data" });

  return {
    source: "Uploaded Excel/CSV file",
    fields,
    policySource,
    policyFields,
    assumptions,
    derivedValues,
    trustStatement:
      "Calculations are performed client-side from uploaded data, active policy values, and labelled system assumptions where applicable.",
  };
}

// ── Score Breakdown ───────────────────────────────────────────────────────────

export function buildScoreBreakdown(metrics: DashboardMetrics): ScoreBreakdown {
  const factors = getHealthScoreContributions(metrics);
  const deductions: ScoreDeduction[] = factors.map((factor) => ({
    factor: factor.label,
    weight: factor.weight,
    rawScore: factor.score,
    contribution: factor.displayedContribution,
    deduction: Math.round((100 - factor.score) * (factor.weight / 100)),
    detail: factor.detail,
  }));

  return {
    baseScore: 100,
    finalScore: metrics.health_score,
    deductions,
    formula: getHealthFormula(metrics),
  };
}
// -- Validation Export ─────────────────────────────────────────────────────────

export function buildValidationExport(
  metrics: DashboardMetrics,
  filename: string,
  detectedFields: string[]
): string {
  const lines: string[] = [
    "SupplySense Validation Report",
    `Generated: ${new Date().toISOString()}`,
    `Source file: ${filename}`,
    `Total SKUs analysed: ${metrics.total_skus}`,
    "",
    "=== KPI VALUES ===",
    `Health Score,${metrics.health_score}/100`,
    `Inventory Value,${formatCurrency(metrics.total_inventory_value)}`,
    `Dead Stock Count,${metrics.dead_stock_count}`,
    `Dead Stock Value,${formatCurrency(metrics.dead_stock_value)}`,
    `Slow Moving Count,${metrics.slow_mover_count}`,
    `Slow Moving Value,${formatCurrency(metrics.slow_mover_value)}`,
    `Stockout Risk Count,${metrics.stockout_risk_count}`,
    `Critical Stockout Count,${metrics.critical_stockout_count}`,
    `Recoverable Capital,${formatCurrency(metrics.recoverable_capital)}`,
    `Turnover Ratio,${metrics.turnover_ratio.toFixed(2)}x`,
    `Reorder Count,${metrics.reorder_count}`,
    "",
    "=== HEALTH SCORE BREAKDOWN ===",
    ...getHealthScoreContributions(metrics).map((factor) => `${factor.label} Score,${factor.isNeutral ? "Neutral" : `${factor.score}/100`},Weight ${factor.weight}%,Contribution +${factor.displayedContribution}`),
    `Composite Score,${metrics.health_score}/100`,
    "",
    "=== ACTIVE POLICY ===",
    `Policy Source,${metrics.active_policy?.source ?? "system defaults"}`,
    `Dead Stock Threshold,${metrics.active_policy?.policy.dead_stock_days ?? 365} days`,
    `Slow Moving Threshold,${metrics.active_policy?.policy.slow_moving_days ?? 180} days`,
    `Safety Stock Days,${metrics.active_policy?.policy.safety_stock_days ?? 15} days`,
    `Critical Coverage Days,${metrics.active_policy?.policy.critical_coverage_days ?? 30} days`,
    `ABC A Threshold,${metrics.active_policy?.policy.abc_a_pct ?? 70}%`,
    "",
    "=== DETECTED COLUMNS ===",
    detectedFields.join(", "),
    "",
    "=== FORMULA LIBRARY ===",
    "Inventory Value,SUM(units_on_hand × unit_cost)",
    "Dead Stock,units where daily_velocity=0 AND days_since_last_sale >= threshold",
    "Slow Moving,units where days_of_supply > slow_moving_threshold AND NOT dead_stock",
    "Stockout Risk,units where stock_qty <= ROP AND daily_velocity > 0",
    "ROP,daily_velocity × lead_time_days + safety_stock_days × daily_velocity",
    "Health Score,weighted average of active InventoryPolicy factor scores",
    "Turnover Ratio,annualised_consumption_cost / current_inventory_value",
    "",
    "=== TRUST STATEMENT ===",
    "All analytics are generated directly from uploaded data and can be independently verified.",
    "Policy values, annualisation, and labelled assumptions are disclosed where used.",
    "This report can be independently audited against the source file.",
  ];
  return lines.join("\n");
}








