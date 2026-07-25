/**
 * Validation Engine - Phase 13: Explainable Analytics & Trust Framework
 *
 * Provides:
 *  - buildLiveCalculation() - step-by-step real-data computations for each KPI
 *  - getWhyExplanation()    - plain-English "why am I seeing this?" per KPI
 *  - getDataLineage()       - source columns + policy info per KPI
 *  - buildScoreBreakdown()  - health-score decomposition from 100 down
 */

import { formatCurrency } from "@/lib/utils";
import type { DashboardMetrics } from "@/lib/types";
import type { KPIKey } from "@/lib/kpi-definitions";
import type { ActivePolicy } from "@/lib/policy";
import { getHealthFormula, getHealthScoreContributions } from "@/lib/health-score";

const validationHealthLabel = (label: string) =>
  label === "Stockout Risk" ? "Replenishment Exposure" : label;

// Types

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
  body: string;           // 2-3 sentence plain-English explanation
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

// Live Calculation Builder

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
          expr: `${s.units_on_hand} units, ${isFinite(s.days_stock_remaining) ? Math.floor(s.days_stock_remaining) + "d supply" : "∞ supply"}`,
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
      const allSkus = metrics.all_skus ?? metrics.top_risk_items;
      const critical = allSkus.filter(
        (s) =>
          !s.is_dead_stock &&
          s.daily_velocity > 0 &&
          (s.replenishment_status === "STOCKED_OUT" || s.days_stock_remaining < s.lead_time_days)
      );
      const atOrBelowRop = allSkus.filter(
        (s) => !s.is_dead_stock && s.daily_velocity > 0 && s.reorder_point_calc > 0 && s.units_on_hand <= s.reorder_point_calc
      );
      const watch = atOrBelowRop.filter(
        (s) => !(s.replenishment_status === "STOCKED_OUT" || s.days_stock_remaining < s.lead_time_days)
      );
      const sample = [...critical, ...watch].slice(0, 5);
      const steps: LiveCalcStep[] = [
        {
          label: "Reorder Point formula",
          expr: "ROP = (daily_velocity × lead_time_days) + safety_stock\nsafety_stock = daily_velocity × " + safetyDays + " days",
          value: "",
        },
        {
          label: "CRITICAL Stockout Risk rule",
          expr: "STOCKED_OUT OR days_of_stock < lead_time_days",
          value: "",
          detail: "Risk score rises as stock coverage falls below lead time; ABC class is not part of the score.",
        },
        {
          label: "WATCH rule",
          expr: "At or below ROP after excluding CRITICAL and dead-stock records",
          value: "",
        },
        { isHeader: true, label: "Sample at-risk items", value: "" },
        ...sample.map((s) => ({
          label: `${s.product_name} (${s.sku_id})`,
          value: s.replenishment_status === "STOCKED_OUT" || s.days_stock_remaining < s.lead_time_days ? "CRITICAL" : "WATCH",
          expr: `${s.units_on_hand} on hand ≤ ROP ${Math.round(s.reorder_point_calc)}, ${isFinite(s.days_stock_remaining) ? Math.floor(s.days_stock_remaining) + "d stock" : "—"}`,
          detail: `Lead time: ${s.lead_time_days}d, velocity: ${s.daily_velocity.toFixed(2)} units/day`,
        })),
        { isHeader: true, label: "Summary", value: "" },
        {
          label: "CRITICAL Stockout Risk",
          expr: "COUNT(STOCKED_OUT OR days_of_stock < lead_time_days)",
          value: String(metrics.stockout_risk_count),
          isFinal: true,
        },
        {
          label: "WATCH",
          value: String(metrics.reorder_watch_count ?? watch.length),
          detail: "At or below ROP after excluding CRITICAL and dead-stock records",
        },
        {
          label: "At or Below ROP / Reorder Population",
          value: String(metrics.reorder_count || atOrBelowRop.length),
        },
      ];
      return {
        totalRecords: metrics.total_skus,
        includedRecords: metrics.stockout_risk_count,
        summary: `${metrics.stockout_risk_count} CRITICAL SKUs; ${metrics.reorder_watch_count ?? watch.length} WATCH SKUs; ${metrics.reorder_count || atOrBelowRop.length} total at or below ROP`,
        steps,
      };
    }

    case "health_score": {
      const factors = getHealthScoreContributions(metrics);
      const steps: LiveCalcStep[] = [
        { isHeader: true, label: "Factor scores and active policy weights", value: "" },
        ...factors.map((factor) => ({
          label: validationHealthLabel(factor.label),
          expr: `${factor.score} x ${(factor.weight / 100).toFixed(2)} = ${factor.exactContribution.toFixed(2)}`,
          value: `+${factor.displayedContribution} pts`,
          detail: factor.key === "stockout_risk" ? "Broader at/below-ROP population used by the approved Health Score factor" : factor.detail,
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
          expr: "Annualised Consumption Cost = SUM(monthly_usage * 12 * unit_cost)\nCurrent Inventory Value = SUM(stock_qty * unit_cost)\nEstimated Inventory Turnover = Annualised Consumption Cost / Current Inventory Value\nEstimated Days of Inventory = 365 / Estimated Inventory Turnover",
          value: "",
        },
        {
          label: "Annualised Consumption Cost",
          expr: "SUM(monthly_usage * 12 * unit_cost)",
          value: formatCurrency(metrics.annualised_consumption_cost ?? metrics.total_inventory_value * metrics.turnover_ratio),
        },
        {
          label: "Current Inventory Value",
          expr: "SUM(stock_qty * unit_cost)",
          value: formatCurrency(metrics.total_inventory_value),
        },
        {
          label: "Estimated Inventory Turnover",
          expr: `Annualised Consumption Cost / Current Inventory Value`,
          value: `${metrics.turnover_ratio.toFixed(2)}×`,
          detail: "Snapshot estimate. Interpret against company targets, historical trend and relevant industry context.",
        },
        {
          label: "Estimated Days of Inventory",
          expr: "365 / Estimated Inventory Turnover",
          value: `${(metrics.estimated_days_inventory ?? (metrics.turnover_ratio > 0 ? 365 / metrics.turnover_ratio : 0)).toFixed(1)} days`,
          isFinal: true,
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
      const policy = metrics.active_policy?.policy;
      const deadRate = policy?.dead_stock_recovery_rate ?? 40;
      const slowRate = policy?.slow_moving_recovery_rate ?? 70;
      const targetCoverage = policy?.target_coverage_months ?? 6;
      const deadRecovery = metrics.estimated_dead_stock_recovery ?? metrics.dead_stock_value * (deadRate / 100);
      const slowRecovery = metrics.estimated_slow_moving_recovery ?? metrics.recoverable_capital - deadRecovery;
      const slowExcessValue = slowRate > 0 ? slowRecovery / (slowRate / 100) : 0;
      const steps: LiveCalcStep[] = [
        {
          label: "Policy formulas",
          expr: "Target Stock = monthly_usage * active target_coverage_months\nSlow-Moving Excess Quantity = MAX(stock_qty - target stock, 0)\nSlow-Moving Excess Value = slow-moving excess quantity * unit_cost",
          value: "",
        },
        {
          label: "Dead Stock Value",
          expr: `${metrics.dead_stock_count} dead stock SKUs`,
          value: formatCurrency(metrics.dead_stock_value),
        },
        {
          label: "Estimated Dead Recovery",
          expr: `Dead Stock Value * ${deadRate}%`,
          value: formatCurrency(deadRecovery),
        },
        {
          label: "Slow-Moving Inventory Value",
          expr: `${metrics.slow_mover_count} slow-moving SKUs`,
          value: formatCurrency(metrics.slow_mover_value),
        },
        {
          label: "Target Coverage",
          value: `${targetCoverage} months`,
        },
        {
          label: "Slow-Moving Excess Value",
          expr: "SUM(MAX(stock_qty - target stock, 0) * unit_cost)",
          value: formatCurrency(slowExcessValue),
        },
        {
          label: "Estimated Slow-Moving Recovery",
          expr: `Slow-Moving Excess Value * ${slowRate}%`,
          value: formatCurrency(slowRecovery),
        },
        {
          label: "Estimated Recoverable Capital",
          expr: `${formatCurrency(deadRecovery)} + ${formatCurrency(slowRecovery)}`,
          value: formatCurrency(metrics.recoverable_capital),
          isFinal: true,
          detail: "Policy-based estimate; not guaranteed cash recovery.",
        },
      ];
      return {
        totalRecords: metrics.total_skus,
        includedRecords: metrics.dead_stock_count + metrics.slow_mover_count,
        summary: `Potentially recoverable value from inventory under recovery review`,
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
          expr: "NOT dead_stock AND daily_velocity > 0 AND ROP > 0 AND stock_qty <= ROP",
          value: "",
        },
        { isHeader: true, label: "By urgency", value: "" },
        { label: "Immediate", value: String(immediate), detail: "STOCKED_OUT or CRITICAL classification" },
        { label: "This week", value: String(thisWeek), detail: "WATCH classification" },
        { label: "Planned", value: String(recs.length - immediate - thisWeek), detail: "Fallback classification for remaining recommendations" },
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

// Plain-English Why am I seeing this?

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
      const weakestLabel = weakest ? validationHealthLabel(weakest.label) : "";
      return {
        headline: `Health Score is ${metrics.health_score}/100 using active policy weights`,
        body: `The score is the weighted sum of the displayed factor scores and active InventoryPolicy weights. ${weakest ? `${weakestLabel} is the weakest active contributor at ${weakest.score}/100 and ${weakest.weight}% weight.` : "No active weighted factor is currently under pressure."} The Replenishment Exposure factor uses the broader at/below-ROP population; ABC profile is informational when its active weight is 0.`,
        impact: `The displayed weighted contributions sum to ${metrics.health_score}, so there are no hidden overrides or undocumented adjustments.`,
        action: weakest ? `Focus first on ${weakestLabel.toLowerCase()} because it has the lowest active component score.` : "Monitor the active factors and keep policy weights reviewed.",
        confidence: "High",
        audience: ["CEO", "Finance Manager", "Supply Chain Manager", "Procurement"],
      };
    }
    case "abc_analysis": {
      const abc = metrics.abc_summary;
      return {
        headline: `${abc.a_count} A-class items drive ${abc.a_revenue_pct}% of your annual consumption value`,
        body: `ABC analysis ranks every item by annual consumption value. A-class items (${abc.a_count} SKUs, ${((abc.a_count / metrics.total_skus) * 100).toFixed(1)}% of your range) account for ${abc.a_revenue_pct}% of annual consumption value. B-class items (${abc.b_count} SKUs) account for ${abc.b_revenue_pct}%, and C-class (${abc.c_count} SKUs) account for the rest.`,
        impact: `ABC supports prioritisation, but replenishment policy must also consider criticality, lead time, service requirements and supplier constraints.`,
        action: `Use ABC class as one prioritisation input alongside demand, lead time, operational requirements and supplier constraints.`,
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
        headline: `${formatCurrency(metrics.recoverable_capital)} is the policy-based potentially recoverable value`,
        body: `This estimate applies active recovery-rate and target-coverage policies to dead stock and slow-moving excess inventory. It is inventory under recovery review, not guaranteed cash recovery.`,
        impact: `Actual recovery depends on item condition, future demand, disposition channel, supplier terms and execution.`,
        action: `Review affected items, validate recovery assumptions, and confirm operational requirements before disposition decisions.`,
        confidence: "High",
        audience: ["CEO", "Finance Manager"],
      };
    }

    case "reorder_count": {
      return {
        headline: `${metrics.reorder_count} items are in replenishment review`,
        body: `These active-demand, non-dead-stock items have stock levels at or below their calculated reorder point. The reorder point covers expected demand during lead time plus active safety-stock days.`,
        impact: `The ${metrics.critical_stockout_count} critical items are most urgent — their stock may be exhausted before the next scheduled delivery. Expedite cost and service impact depend on supplier and customer context.`,
        action: `Verify open orders, inbound stock, transfers, supplier constraints and operational requirements before raising a purchase order.`,
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

// Data Lineage

const FIELD_MAP: Record<KPIKey, { column: string; displayName?: string; role: string; required: boolean }[]> = {
  inventory_value: [
    { column: "units_on_hand", role: "Stock quantity",   required: true },
    { column: "unit_cost",     role: "Per-unit cost",    required: true },
  ],
  dead_stock: [
    { column: "units_on_hand",      role: "Stock quantity",     required: true },
    { column: "unit_cost",          role: "Per-unit cost",      required: true },
    { column: "ageing_days",        role: "Optional primary movement-history input when supplied", required: false },
    { column: "last_movement_date", role: "Used to calculate days since last inventory movement", required: false },
    { column: "monthly_usage",      role: "Fallback classification input when movement history is unavailable", required: false },
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
    { column: "monthly_usage",  role: "Units consumed, issued or sold during a typical 30-day period",  required: true },
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
    { column: "ageing_days",    role: "Primary movement-history input when supplied", required: false },
    { column: "last_movement_date", role: "Used to calculate days since last inventory movement when direct ageing is unavailable", required: false },
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
  activePolicy?: ActivePolicy | null,
  isDemoMode = false
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
        { field: "weight_stockout_risk", label: "Replenishment exposure weight", suffix: "%" },
      ],
      recoverable_capital: [
        { field: "dead_stock_days", label: "Dead stock threshold", suffix: " days" },
        { field: "slow_moving_days", label: "Slow moving threshold", suffix: " days" },
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
  if (key === "dead_stock") derivedValues.push({ label: "Primary dead-stock classification", value: "stock_qty > 0 AND days_since_last_movement >= active dead_stock_days" }, { label: "Fallback dead-stock classification", value: "when movement history is unavailable: stock_qty > 0 AND monthly_usage = 0" });
  if (key === "slow_moving") derivedValues.push({ label: "Daily usage", value: "monthly_usage / 30" }, { label: "Days of supply", value: "stock_qty / daily_usage" }, { label: "Classification dependency", value: "dead_stock items are excluded" });
  if (key === "stockout_risk") derivedValues.push({ label: "CRITICAL Stockout Risk", value: "STOCKED_OUT or days_of_stock < lead_time_days" }, { label: "WATCH", value: "at or below ROP after excluding CRITICAL and dead-stock records" });
  if (key === "reorder_count") derivedValues.push({ label: "Safety stock", value: "daily_usage * safety_stock_days" }, { label: "Reorder point", value: "lead-time demand + safety stock" }, { label: "Eligibility", value: "NOT dead_stock AND daily_velocity > 0 AND ROP > 0 AND stock_qty <= ROP" });
  if (key === "abc_analysis") derivedValues.push({ label: "Annual consumption value", value: "monthly_usage * 12 * unit_cost" });
  if (key === "turnover_ratio") {
    assumptions.push({ label: "Annualisation", value: "Monthly usage multiplied by 12" }, { label: "Days conversion", value: "365 / turnover" });
    derivedValues.push({ label: "Annualised consumption cost", value: "sum(monthly_usage * 12 * unit_cost)" });
  }
  if (key === "ageing_score" || key === "blocked_capital" || key === "avg_ageing_days") {
    derivedValues.push({ label: "Ageing source", value: "ageing_days used directly when present; otherwise derived from last_movement_date" });
  }
  if (key === "recoverable_capital") {
    assumptions.push({ label: "Recovery rates", value: "Policy assumptions, not uploaded data" }, { label: "Recovery estimate", value: "Potentially recoverable value; not guaranteed cash recovery" });
    derivedValues.push({ label: "Target stock", value: "monthly_usage * active target_coverage_months" }, { label: "Slow-moving excess quantity", value: "MAX(stock_qty - target stock, 0)" }, { label: "Slow-moving excess value", value: "slow-moving excess quantity * unit_cost" });
  }
  return {
    source: isDemoMode ? "Deterministic built-in demo dataset" : "Uploaded Excel/CSV file",
    fields,
    policySource,
    policyFields,
    assumptions,
    derivedValues,
    trustStatement:
      isDemoMode
        ? "Calculations are performed client-side from the deterministic built-in demo dataset, active policy values, and labelled system assumptions where applicable."
        : "Calculations are performed client-side from uploaded data, active policy values, and labelled system assumptions where applicable.",
  };
}

// Score Breakdown

export function buildScoreBreakdown(metrics: DashboardMetrics): ScoreBreakdown {
  const factors = getHealthScoreContributions(metrics);
  const deductions: ScoreDeduction[] = factors.map((factor) => ({
    factor: validationHealthLabel(factor.label),
    weight: factor.weight,
    rawScore: factor.score,
    contribution: factor.displayedContribution,
    deduction: Math.round((100 - factor.score) * (factor.weight / 100)),
    detail: factor.key === "stockout_risk" ? "Broader at/below-ROP population used by the approved Health Score factor" : factor.detail,
  }));

  return {
    baseScore: 100,
    finalScore: metrics.health_score,
    deductions,
    formula: getHealthFormula(metrics),
  };
}
