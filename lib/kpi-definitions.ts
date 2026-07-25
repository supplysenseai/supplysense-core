/**
 * KPI Definitions — Phase 10: Explainable Analytics
 *
 * Every KPI exposed in the dashboard is documented here with:
 *  - plain-English definition
 *  - exact formula as rendered code
 *  - data fields consumed
 *  - worked example (static, illustrative)
 *  - business interpretation guide
 */

export type KPIKey =
  | "inventory_value"
  | "dead_stock"
  | "slow_moving"
  | "stockout_risk"
  | "abc_analysis"
  | "health_score"
  | "ageing_score"
  | "recoverable_capital"
  | "turnover_ratio"
  | "reorder_count"
  | "blocked_capital"
  | "avg_ageing_days";

export interface FormulaStep {
  label: string;
  expr: string;
}

export interface KPIDefinition {
  key: KPIKey;
  title: string;
  tagline: string;
  definition: string;
  formula: FormulaStep[];
  fields: { name: string; label?: string; description: string; required: boolean }[];
  example: {
    context: string;
    steps: { label: string; value: string }[];
    result: string;
    note?: string;
  };
  interpretation: {
    good: string;
    warning: string;
    critical: string;
    tip: string;
    labels?: {
      good: string;
      warning: string;
      critical: string;
      tip: string;
    };
  };
  linkedKPIs?: KPIKey[];
}

export const TURNOVER_ASSURANCE_TEXT =
  "Calculated from uploaded inventory data using disclosed annualisation and 365-day conventions. Item-level values and turnover estimates are shown for calculation transparency.";

export function getKPIAssuranceText(key: KPIKey, isDemoMode = false): string {
  if (isDemoMode) {
    return "Records from the deterministic built-in demo dataset that contribute to this KPI. All figures are derived directly from the demo dataset.";
  }
  return key === "turnover_ratio"
    ? TURNOVER_ASSURANCE_TEXT
    : "Records from your uploaded dataset that contribute to this KPI. All figures are derived directly from the uploaded file.";
}

export function getKPIReconciliationStatus(key: KPIKey): string {
  return ["recoverable_capital", "turnover_ratio"].includes(key)
    ? "Reconciled with Assumptions"
    : "Reconciled";
}

export function getKPIInterpretationLabels(def: KPIDefinition) {
  return def.interpretation.labels ?? {
    good: "Good",
    warning: "Warning",
    critical: "Critical",
    tip: "Tip",
  };
}

export const KPI_DEFINITIONS: Record<KPIKey, KPIDefinition> = {
  inventory_value: {
    key: "inventory_value",
    title: "Inventory Value",
    tagline: "Total capital tied up in stock",
    definition:
      "The total monetary value of all on-hand inventory, calculated by multiplying the quantity on hand for each SKU by its unit cost. This represents the capital currently locked in your warehouse and is the foundation for carrying cost and turnover calculations.",
    formula: [
      { label: "Per-SKU value",  expr: "SKU Value  =  Units on Hand  ×  Unit Cost" },
      { label: "Portfolio total", expr: "Inventory Value  =  Σ (Units on Hand × Unit Cost)  for all SKUs" },
    ],
    fields: [
      { name: "units_on_hand",  description: "Current quantity in stock",   required: true },
      { name: "unit_cost",      description: "Cost price per individual unit", required: true },
    ],
    example: {
      context: "A warehouse with 3 SKUs",
      steps: [
        { label: "SKU A  (500 units × $4.20)",  value: "$2,100" },
        { label: "SKU B  (200 units × $18.00)", value: "$3,600" },
        { label: "SKU C  (80  units × $75.00)", value: "$6,000" },
        { label: "Total Inventory Value",        value: "$11,700" },
      ],
      result: "$11,700",
      note: "Annual carrying cost is estimated at 25% of this total = $2,925/yr.",
    },
    interpretation: {
      good:     "Value is proportional to your annual consumption value and turnover rate — stock turns quickly and capital works hard.",
      warning:  "High value relative to monthly sales suggests overstocking or slow-moving items absorbing working capital.",
      critical: "Inventory value growing while annual consumption value stays flat is a cash-flow warning sign requiring immediate SKU review.",
      tip:      "Compare inventory value against company targets, historical consumption and service requirements; review supporting SKU records before concluding the cause.",
    },
    linkedKPIs: ["dead_stock", "slow_moving", "turnover_ratio"],
  },

  dead_stock: {
    key: "dead_stock",
    title: "Dead Stock",
    tagline: "Items with no recent inventory movement",
    definition:
      "Dead stock is primarily classified from movement history: stock_qty > 0 and days since last movement is at or above the active dead_stock_days policy. When movement history is unavailable, stock on hand with zero monthly usage can be classified by fallback. Recovery estimates are policy-based and should not be treated as guaranteed cash recovery.",
    formula: [
      { label: "Primary condition", expr: "Is Dead = stock_qty > 0 AND days_since_last_movement >= active dead_stock_days" },
      { label: "Fallback condition", expr: "When movement history is unavailable: stock_qty > 0 AND monthly_usage = 0" },
      { label: "Dead value", expr: "Dead Stock Value = SUM(Units on Hand x Unit Cost) where Is Dead = true" },
      { label: "Carry cost", expr: "Dead Stock Carry Cost = Dead Stock Value x 0.25 (25% annual rate)" },
    ],
    fields: [
      { name: "units_on_hand", description: "Current quantity in stock", required: true },
      { name: "unit_cost", description: "Cost price per unit", required: true },
      { name: "ageing_days", description: "Optional days since last inventory movement", required: false },
      { name: "last_movement_date", description: "Used to calculate days since last inventory movement", required: false },
      { name: "units_sold_30d", label: "Monthly Usage", description: "Fallback usage input when movement history is unavailable", required: false },
    ],
    example: {
      context: "SKU: WIDGET-007 - 150 units on hand, $12.50 unit cost, no movement history supplied, 0 monthly usage",
      steps: [
        { label: "Fallback monthly usage", value: "0 units - fallback classification can apply only when movement history is unavailable" },
        { label: "Dead stock value", value: "150 x $12.50 = $1,875" },
        { label: "Annual carrying cost", value: "$1,875 x 25% = $468.75/yr" },
      ],
      result: "$1,875 inventory value under dead-stock review",
      note: "Review condition, demand, substitution options, supplier returns and disposition channels before assuming recovery value.",
    },
    interpretation: {
      good: "Dead stock < 3% of total inventory value. Capital is deployed in moving inventory.",
      warning: "Dead stock 3-10% of total value. Review these SKUs quarterly; consider demand, movement history, transfers, supplier returns or disposition options.",
      critical: "Dead stock > 10% of total value. Prioritised review recommended; actual recovery depends on item condition and disposition path.",
      tip: "Sort dead stock by value descending and review highest-value items first for recovery planning.",
    },
    linkedKPIs: ["inventory_value", "recoverable_capital"],
  },

  slow_moving: {
    key: "slow_moving",
    title: "Slow Moving Inventory",
    tagline: "Stock with coverage above the active slow-moving policy threshold",
    definition:
      "Slow-moving SKUs are active-demand items whose days of supply exceed the active slow-moving policy threshold. Dead-stock items are excluded so the same SKU is not double counted as both dead and slow moving.",
    formula: [
      { label: "Monthly usage",       expr: "monthly_usage = units consumed, issued or sold during a typical 30-day period" },
      { label: "Daily usage",         expr: "daily_usage = monthly_usage / 30" },
      { label: "Days of supply",      expr: "days_of_supply = stock_qty / daily_usage" },
      { label: "Slow mover flag",     expr: "Slow Moving = daily_usage > 0 AND days_of_supply > active slow_moving_days AND NOT dead_stock" },
      { label: "Slow mover value",    expr: "Slow Mover Value = SUM(stock_qty x unit_cost) where Slow Moving = true" },
    ],
    fields: [
      { name: "units_on_hand",  description: "Current quantity in stock", required: true },
      { name: "unit_cost",      description: "Cost price per unit", required: true },
      { name: "units_sold_30d", description: "Units consumed, issued or sold during a typical 30-day period", required: true },
    ],
    example: {
      context: "SKU: BOLT-M8 - 1,200 units on hand, $0.85 unit cost, 40 units consumed, issued or sold during a typical 30-day period",
      steps: [
        { label: "Daily usage",          value: "40 / 30 = 1.33 units/day" },
        { label: "Days of supply",       value: "1,200 / 1.33 = 900 days" },
        { label: "Active threshold",     value: "Compared with active slow_moving_days policy" },
        { label: "Dead-stock exclusion", value: "Only counted if NOT dead_stock" },
        { label: "Inventory value",      value: "1,200 x $0.85 = $1,020" },
      ],
      result: "Flagged only when days of supply exceeds the active slow-moving threshold and the item is not dead stock",
      note: "The slow-moving threshold is a classification policy, not a reorder target.",
    },
    interpretation: {
      good:     "Slow-moving exposure is currently below the selected review threshold.",
      warning:  "Moderate slow-moving exposure detected. Possible causes may include over-ordering, lower demand, forecast changes, minimum-order quantities or obsolete requirements.",
      critical: "High slow-moving exposure detected. Possible causes may include over-ordering, lower demand, forecast changes, minimum-order quantities or obsolete requirements. Review affected items before taking action.",
      tip:      "The slow-moving threshold is a classification policy, not a reorder target. Review demand, stock coverage and future requirements before changing replenishment settings.",
    },
    linkedKPIs: ["dead_stock", "inventory_value", "turnover_ratio"],
  },
  stockout_risk: {
    key: "stockout_risk",
    title: "Stockout Risk",
    tagline: "CRITICAL SKUs whose coverage is below lead time",
    definition:
      "A SKU is CRITICAL for stockout risk when it is stocked out or its days of stock is below supplier lead time. WATCH items are at or below ROP after excluding CRITICAL and dead-stock records. The risk score rises as coverage falls below lead time; ABC class is not part of the risk score.",
    formula: [
      { label: "Daily velocity", expr: "Daily Velocity = Monthly Usage / 30" },
      { label: "Days remaining", expr: "Days of Stock = Units on Hand / Daily Velocity" },
      { label: "CRITICAL Stockout Risk", expr: "STOCKED_OUT OR days_of_stock < lead_time_days" },
      { label: "WATCH", expr: "At or below ROP after excluding CRITICAL and dead-stock records" },
      { label: "Risk score", expr: "Score rises as coverage falls below lead time; ABC class is not part of the score" },
    ],
    fields: [
      { name: "units_on_hand", description: "Current quantity in stock", required: true },
      { name: "units_sold_30d", label: "Monthly Usage", description: "Units consumed, issued or sold during a typical 30-day period", required: true },
      { name: "lead_time_days", description: "Supplier delivery lead time in days", required: true },
      { name: "unit_cost", description: "For optional financial context", required: false },
    ],
    example: {
      context: "SKU: MOTOR-3HP - 45 units on hand, 15 monthly usage, 21-day lead time",
      steps: [
        { label: "Daily velocity", value: "15 / 30 = 0.5 units/day" },
        { label: "Days of stock", value: "45 / 0.5 = 90 days" },
        { label: "Lead time", value: "21 days" },
        { label: "Status", value: "90 > 21 -> HEALTHY (not CRITICAL)" },
      ],
      result: "HEALTHY - 90 days of stock vs 21-day lead time",
      note: "If stock dropped to 9 units: 9 / 0.5 = 18 days < 21-day lead time, so the SKU is CRITICAL.",
    },
    interpretation: {
      good: "CRITICAL count = 0. All SKUs have sufficient buffer above their lead time.",
      warning: "1-5 CRITICAL SKUs. Review replenishment parameters, demand assumptions and recent purchasing decisions for those items.",
      critical: "6+ CRITICAL SKUs or any operationally critical item at risk. Possible production stoppage or consumption-value impact should be reviewed.",
      tip: "Event2Act uses active safety_stock_days for ROP safety stock. Review safety-stock policy, open orders, transfers and supplier constraints before action.",
    },
    linkedKPIs: ["reorder_count", "health_score"],
  },

  abc_analysis: {
    key: "abc_analysis",
    title: "ABC Analysis",
    tagline: "Pareto-based classification for prioritisation",
    definition:
      "ABC Analysis ranks SKUs by annual consumption value using Monthly Usage x 12 x Unit Cost. It supports prioritisation, but replenishment policy must also consider criticality, lead time, service requirements and supplier constraints.",
    formula: [
      { label: "SKU annual consumption value contribution", expr: "SKU Annual Consumption Value = Monthly Usage x 12 x Unit Cost" },
      { label: "Sort descending", expr: "Rank SKUs by SKU Annual Consumption Value from highest to lowest" },
      { label: "Cumulative %", expr: "Cumulative % = Running Sum of Annual Consumption Value / Total Annual Consumption Value x 100" },
      { label: "Assign class", expr: "A = cumulative <= active abc_a_pct | B = cumulative > active abc_a_pct AND <= active abc_a_pct + active abc_b_pct | C = remaining items" },
    ],
    fields: [
      { name: "units_sold_30d", label: "Monthly Usage", description: "Units consumed, issued or sold during a typical 30-day period", required: true },
      { name: "unit_cost", description: "Unit cost for annual consumption value calculation", required: true },
    ],
    example: {
      context: "4-SKU portfolio",
      steps: [
        { label: "SKU Alpha - $8,000 annual consumption value (cum: 53%)", value: "A-class" },
        { label: "SKU Beta - $4,500 annual consumption value (cum: 83%)", value: "B-class" },
        { label: "SKU Gamma - $2,000 annual consumption value (cum: 96%)", value: "C-class" },
        { label: "SKU Delta - $600 annual consumption value (cum: 100%)", value: "C-class" },
      ],
      result: "1 A-item drives 53% of annual consumption value; 1 B-item adds 30%; 2 C-items share 17%",
      note: "ABC supports prioritisation. Replenishment settings should also consider criticality, lead time, service requirements and supplier constraints.",
    },
    interpretation: {
      good: "ABC concentration can help prioritise review effort when annual consumption value is materially concentrated.",
      warning: "A broad A-class share may indicate fragmented demand or cost concentration requiring closer review.",
      critical: "If total Annual Consumption Value is zero, the current analyzer places records into C-class because no cumulative value can be assigned.",
      tip: "Use ABC as one prioritisation input alongside criticality, lead time, service requirements and supplier constraints.",
    },
    linkedKPIs: ["inventory_value", "stockout_risk", "health_score"],
  },

  health_score: {
    key: "health_score",
    title: "Inventory Health Score",
    tagline: "Single 0-100 composite score for your entire inventory portfolio",
    definition:
      "The Inventory Health Score is a weighted composite of active policy factors. The factor labelled Replenishment Exposure uses the broader at/below-ROP population and keeps the underlying weight_stockout_risk policy key unchanged. ABC is informational when its active weight is 0.",
    formula: [
      { label: "Dead Stock sub-score", expr: "Dead Score = 100 - dead_stock_pct x 2; weighted by active InventoryPolicy" },
      { label: "Slow Mover sub-score", expr: "Slow Score = 100 - slow_mover_pct x 2; weighted by active InventoryPolicy" },
      { label: "Replenishment Exposure sub-score", expr: "Replenishment Exposure Score = 100 - at_or_below_ROP_pct x 2.5; weighted by weight_stockout_risk" },
      { label: "ABC profile", expr: "Neutral/informational when its active weight is 0; normal Pareto concentration is not penalised" },
      { label: "Composite score", expr: "Health Score = sum(factor score x active InventoryPolicy weight); active weights must total 100%" },
    ],
    fields: [
      { name: "units_on_hand", description: "Required for all sub-scores", required: true },
      { name: "unit_cost", description: "Required for value-based sub-scores", required: true },
      { name: "units_sold_30d", label: "Monthly Usage", description: "Required for usage and replenishment exposure", required: true },
      { name: "lead_time_days", description: "Required for replenishment exposure context", required: true },
    ],
    example: {
      context: "Portfolio with 200 SKUs, $500K inventory value",
      steps: [
        { label: "Dead stock = 8% -> Dead score", value: "100 - 8 x 2 = 84" },
        { label: "Slow movers = 18% -> Slow score", value: "100 - 18 x 2 = 64" },
        { label: "12 at/below ROP SKUs (6%) -> Replenishment Exposure score", value: "100 - 6 x 2.5 = 85" },
        { label: "ABC profile", value: "Informational only when active weight = 0" },
        { label: "Composite", value: "Use active InventoryPolicy weights; e.g. 84x0.30 + 64x0.25 + 85x0.45 = 79" },
      ],
      result: "Health Score uses the approved analyzer output and active policy weights",
      note: "Replenishment Exposure is the visible label for the broader at/below-ROP health factor; the policy key remains weight_stockout_risk.",
    },
    interpretation: {
      good: "80-100: Healthy. Inventory is well-managed. Monitor monthly and focus on continuous optimisation.",
      warning: "60-79: Needs attention. One or two sub-scores are dragging the composite. Identify and review the weakest factor.",
      critical: "< 60: Multiple inventory pressures are active simultaneously. Prioritise review by operational impact and policy weight.",
      tip: "Improve the lowest active sub-score first; it has the largest marginal impact on the composite.",
    },
    linkedKPIs: ["dead_stock", "slow_moving", "stockout_risk", "abc_analysis"],
  },

  ageing_score: {
    key: "ageing_score",
    title: "Ageing Health Score",
    tagline: "Composite score measuring how fresh your inventory is by age distribution",
    definition:
      "The Ageing Health Score measures the age-based health of your inventory portfolio. Items are bucketed by how long they have been in the warehouse (0–30d, 31–60d, 61–90d, 91–180d, 181d+). Older stock penalises the score. The score reflects risk of obsolescence, quality degradation, and carrying cost accumulation.",
    formula: [
      { label: "Age bucket weights", expr: "0–30d=100 | 31–60d=80 | 61–90d=60 | 91–180d=30 | 181d+=0" },
      { label: "Weighted score",     expr: "Ageing Score  =  S (bucket_pct_value × bucket_weight)  ÷  100" },
      { label: "Dead stock penalty", expr: "Final Score  =  Ageing Score × (1 - dead_stock_pct × 0.5)" },
    ],
    fields: [
      { name: "ageing_days",  description: "Direct days since last movement when supplied", required: false },
      { name: "last_movement_date", description: "Used to derive ageing days when direct ageing is not supplied", required: false },
      { name: "stock_qty",    description: "Quantity on hand for weighting by value",      required: true },
      { name: "unit_cost",    description: "Unit cost for value-weighted bucket scoring",  required: true },
    ],
    example: {
      context: "100-item portfolio by value distribution across buckets",
      steps: [
        { label: "0–30d:   40% of value × weight 100",  value: "40.0 pts" },
        { label: "31–60d:  25% of value × weight 80",   value: "20.0 pts" },
        { label: "61–90d:  15% of value × weight 60",   value: "9.0 pts" },
        { label: "91–180d: 12% of value × weight 30",   value: "3.6 pts" },
        { label: "181d+:    8% of value × weight 0",    value: "0.0 pts" },
        { label: "Raw score",                           value: "72.6" },
      ],
      result: "Ageing Score: 73 / 100 — Average",
      note: "The 8% of value in 181d+ stock contributes zero points. Liquidating it would move the score toward ~79.",
    },
    interpretation: {
      good:     "80–100: Fresh portfolio. Most value is in recently received stock with low obsolescence risk.",
      warning:  "60–79: Growing ageing risk. Stock aged 91d+ is accumulating — review purchasing frequency.",
      critical: "< 60: Significant portion of inventory is aged. Immediate liquidation or write-down programme required.",
      tip:      "Focus on items in the 91–180d bucket — they are still salvageable but approaching dead status fast.",
    },
    linkedKPIs: ["dead_stock", "blocked_capital"],
  },

  recoverable_capital: {
    key: "recoverable_capital",
    title: "Estimated Recoverable Capital",
    tagline: "Policy-based estimate of potentially recoverable value",
    definition:
      "Estimated Recoverable Capital is a policy-based estimate of potentially recoverable value from dead stock and slow-moving excess stock. It is subject to active recovery-rate and target-coverage assumptions and should not be treated as guaranteed cash recovery.",
    formula: [
      { label: "Target stock", expr: "Target Stock = monthly_usage x active target_coverage_months" },
      { label: "Slow-moving excess quantity", expr: "Slow-Moving Excess Quantity = MAX(stock_qty - target stock, 0)" },
      { label: "Slow-moving excess value", expr: "Slow-Moving Excess Value = slow-moving excess quantity x unit_cost" },
      { label: "Estimated dead-stock recovery", expr: "Dead Recovery = Dead Stock Value x active dead_stock_recovery_rate" },
      { label: "Estimated slow-moving recovery", expr: "Slow Recovery = Slow-Moving Excess Value x active slow_moving_recovery_rate" },
      { label: "Estimated recoverable capital", expr: "Estimated Recoverable Capital = Estimated Dead-Stock Recovery + Estimated Slow-Moving Recovery" },
    ],
    fields: [
      { name: "units_on_hand", description: "Stock quantities for excess calculation", required: true },
      { name: "unit_cost", description: "Cost basis for recovery-rate calculation", required: true },
      { name: "units_sold_30d", label: "Monthly Usage", description: "Units consumed, issued or sold during a typical 30-day period", required: true },
      { name: "ageing_days", description: "Primary movement-history input when supplied", required: false },
      { name: "last_movement_date", description: "Used to calculate days since last inventory movement when direct ageing is unavailable", required: false },
    ],
    example: {
      context: "Dead stock value and slow-moving excess value with active recovery-rate policy assumptions",
      steps: [
        { label: "Target coverage", value: "monthly_usage x active target_coverage_months" },
        { label: "Slow-moving excess value", value: "MAX(stock_qty - target stock, 0) x unit_cost" },
        { label: "Estimated dead-stock recovery", value: "Dead Stock Value x active recovery rate" },
        { label: "Estimated slow-moving recovery", value: "Slow-Moving Excess Value x active recovery rate" },
      ],
      result: "Estimated recovery is policy-based and subject to recovery-rate and excess-stock assumptions",
      note: "Actual recovery depends on product condition, market demand, channel, supplier terms and execution.",
    },
    interpretation: {
      good: "Estimated recoverable capital is low relative to total inventory value.",
      warning: "Moderate estimated recoverable capital. Review affected items, recovery assumptions and replenishment settings.",
      critical: "High estimated recoverable capital. This may indicate material inventory under recovery review, subject to policy recovery assumptions.",
      tip: "Treat this as an estimate, not guaranteed cash. Validate recovery rates, excess-stock assumptions and item-level disposition options before acting.",
    },
    linkedKPIs: ["dead_stock", "slow_moving"],
  },
  turnover_ratio: {
    key: "turnover_ratio",
    title: "Estimated Inventory Turnover",
    tagline: "Snapshot estimate based on annualised consumption and current inventory value",
    definition:
      "Estimated Inventory Turnover is a snapshot ratio based on annualised monthly usage and current inventory value. Interpret it against the company\'s own targets, historical trend and relevant industry context; fixed universal Good/Warning/Critical bands are not applied.",
    formula: [
      { label: "Annualised Consumption Cost", expr: "Annualised Consumption Cost = SUM(monthly_usage x 12 x unit_cost)" },
      { label: "Current Inventory Value",     expr: "Current Inventory Value = SUM(stock_qty x unit_cost)" },
      { label: "Estimated Inventory Turnover", expr: "Estimated Inventory Turnover = Annualised Consumption Cost / Current Inventory Value" },
      { label: "Estimated Days of Inventory", expr: "Estimated Days of Inventory = 365 / Estimated Inventory Turnover" },
    ],
    fields: [
      { name: "units_on_hand",    description: "Current stock quantity for inventory value", required: true },
      { name: "unit_cost",        description: "Cost basis for consumption and inventory value", required: true },
      { name: "units_sold_30d",   label: "Monthly Usage", description: "Units consumed, issued or sold during a typical 30-day period.", required: true },
    ],
    example: {
      context: "Current inventory snapshot with annualised consumption",
      steps: [
        { label: "Annualised Consumption Cost", value: "SUM(monthly_usage x 12 x unit_cost)" },
        { label: "Current Inventory Value", value: "SUM(stock_qty x unit_cost)" },
        { label: "Estimated Turnover", value: "Annualised Consumption Cost / Current Inventory Value" },
        { label: "Estimated Days of Inventory", value: "365 / Estimated Turnover" },
      ],
      result: "Estimated turnover should be interpreted against company targets, history and relevant context",
      note: "Low turnover may indicate excess stock, slower demand, long replenishment cycles, strategic buffers or product-mix effects. Review supporting inventory records before concluding the cause.",
    },
    interpretation: {
      good:     "Turnover is a snapshot estimate based on annualised consumption and current inventory value.",
      warning:  "Compare turnover against company targets, historical trends and relevant industry context.",
      critical: "Lower turnover may be associated with excess stock, slower demand, long replenishment cycles, strategic buffers or product-mix effects. Review supporting records before concluding the cause.",
      tip:      "Improving turnover may reduce capital tied up in inventory, but the financial impact depends on demand, service requirements and the amount of inventory that can be safely reduced.",
      labels: {
        good: "Interpretation",
        warning: "Context",
        critical: "Possible Drivers",
        tip: "Action",
      },
    },
    linkedKPIs: ["inventory_value", "dead_stock", "slow_moving"],
  },
  reorder_count: {
    key: "reorder_count",
    title: "Reorder Count",
    tagline: "SKUs in replenishment review",
    definition:
      "The reorder count is the broader replenishment-review population: active-demand, non-dead-stock SKUs with ROP > 0 where on-hand stock is at or below calculated ROP. Items above ROP are not in the reorder zone; review open orders, inbound stock, transfers, supplier constraints and operational requirements before raising a purchase order.",
    formula: [
      { label: "Reorder point", expr: "ROP = (Daily Velocity x Lead Time) + Safety Stock" },
      { label: "Safety stock", expr: "Safety Stock = Daily Velocity x active safety_stock_days" },
      { label: "Reorder flag", expr: "NOT dead_stock AND daily_velocity > 0 AND ROP > 0 AND stock_qty <= ROP" },
    ],
    fields: [
      { name: "units_on_hand", description: "Current stock to compare against ROP", required: true },
      { name: "units_sold_30d", label: "Monthly Usage", description: "Velocity for ROP calculation", required: true },
      { name: "lead_time_days", description: "Lead time for reorder point calculation", required: true },
    ],
    example: {
      context: "SKU: GASKET-22 - 80 units on hand, 20 units/month, 14-day lead time",
      steps: [
        { label: "Daily velocity", value: "20 / 30 = 0.667 units/day" },
        { label: "Safety stock", value: "0.667 x active safety_stock_days (15 days currently = 10 units)" },
        { label: "Reorder point", value: "(0.667 x 14) + 10 = 9.3 + 10 = 19 units" },
        { label: "On-hand vs ROP", value: "80 > 19 -> not in replenishment review yet" },
      ],
      result: "GASKET-22 remains above ROP",
      note: "If on-hand were 15 units (< ROP 19), replenishment review would be recommended.",
    },
    interpretation: {
      good: "Reorder count is low relative to SKU count. Continue monitoring demand, lead times and open orders.",
      warning: "Moderate replenishment exposure. Review open orders, inbound stock, transfers and supplier constraints.",
      critical: "High replenishment-review population. Prioritise verification before raising purchase orders.",
      tip: "Verify open orders, inbound stock, transfers, supplier constraints and operational requirements before raising a purchase order.",
    },
    linkedKPIs: ["stockout_risk", "health_score"],
  },

  blocked_capital: {
    key: "blocked_capital",
    title: "Blocked Capital",
    tagline: "Total value tied up in dead and slow-moving stock",
    definition:
      "Blocked capital is the combined inventory value of dead stock plus slow-moving stock. It represents working capital that has been deployed into inventory but is generating no or minimal return. Unlike Recoverable Capital (which estimates what you can get back), Blocked Capital shows the full cost of the problem.",
    formula: [
      { label: "Blocked capital",   expr: "Blocked Capital  =  Dead Stock Value  +  Slow Moving Stock Value" },
      { label: "Annual drain",      expr: "Annual Carry Cost  =  Blocked Capital  ×  0.25  (25% carrying rate)" },
    ],
    fields: [
      { name: "units_on_hand",    description: "Stock quantities for value calculation",     required: true },
      { name: "unit_cost",        description: "Cost per unit",                              required: true },
      { name: "units_sold_30d",   description: "To determine dead/slow classification",      required: true },
    ],
    example: {
      context: "Dead stock: $15,000 | Slow-moving stock: $42,000",
      steps: [
        { label: "Dead stock value",         value: "$15,000" },
        { label: "Slow-moving stock value",  value: "$42,000" },
        { label: "Total blocked capital",    value: "$57,000" },
        { label: "Annual carry cost",        value: "$57,000 × 25% = $14,250/yr" },
      ],
      result: "$57,000 blocked — costing $14,250 per year just to hold",
    },
    interpretation: {
      good:     "Blocked capital < 10% of total inventory value.",
      warning:  "10–25% blocked. Significant portion of working capital is unproductive.",
      critical: "> 25% blocked. Cash flow risk. Prioritise liquidation and stop reordering blocked SKUs.",
      tip:      "Every dollar of blocked capital cleared also saves $0.25 in annual carrying costs.",
    },
    linkedKPIs: ["dead_stock", "slow_moving", "recoverable_capital"],
  },

  avg_ageing_days: {
    key: "avg_ageing_days",
    title: "Average Ageing Days",
    tagline: "Value-weighted average age of inventory across all SKUs",
    definition:
      "Average Ageing Days is a value-weighted measure of how long stock has been sitting in the warehouse. It weights each item's age by its inventory value so that high-value old stock has a greater impact on the metric than low-value old stock. It is the primary diagnostic for age-related inventory risk.",
    formula: [
      { label: "Item inventory value",        expr: "Item Value  =  Stock Qty  ×  Unit Cost" },
      { label: "Value-weighted ageing days",  expr: "Avg Ageing Days  =  S (Ageing Days × Item Value)  ÷  S (Item Value)" },
    ],
    fields: [
      { name: "ageing_days",  description: "Direct days since last movement when supplied", required: false },
      { name: "last_movement_date", description: "Used to derive ageing days when direct ageing is not supplied", required: false },
      { name: "stock_qty",    description: "Quantity on hand",                             required: true },
      { name: "unit_cost",    description: "Cost per unit for value-weighting",            required: true },
    ],
    example: {
      context: "3-item warehouse",
      steps: [
        { label: "Item A: 30d age × $5,000 value",  value: "150,000 day-dollars" },
        { label: "Item B: 90d age × $2,000 value",  value: "180,000 day-dollars" },
        { label: "Item C: 200d age × $1,000 value", value: "200,000 day-dollars" },
        { label: "Total value",                      value: "$8,000" },
        { label: "Weighted avg",                     value: "530,000 ÷ 8,000 = 66 days" },
      ],
      result: "66 average ageing days (value-weighted)",
      note: "Item C (200d) only weighs $1,000 so its extreme age is dampened. If Item A aged badly it would dominate.",
    },
    interpretation: {
      good:     "= 60 days: Fresh stock. Most value received recently with high sell-through.",
      warning:  "61–120 days: Moderate ageing. Some slow-movers building up. Review high-value aged items.",
      critical: "> 120 days: Significant ageing. High risk of obsolescence and quality degradation.",
      tip:      "Sort items by (ageing_days × unit_cost) descending to find the highest-impact items to address first.",
    },
    linkedKPIs: ["ageing_score", "blocked_capital"],
  },
};



