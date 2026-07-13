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

export function getKPIAssuranceText(key: KPIKey): string {
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
    tagline: "Items with zero movement — cash trapped with no return",
    definition:
      "Dead stock comprises SKUs that have recorded zero sales velocity in the last 30 days AND still hold units on hand. These items are generating carrying costs with no annual consumption value offset and are the highest-priority candidates for liquidation, write-down, or redeployment.",
    formula: [
      { label: "Condition",     expr: "Is Dead  =  (Monthly Usage = 0)  AND  (Units on Hand > 0)" },
      { label: "Dead value",    expr: "Dead Stock Value  =  Σ (Units on Hand × Unit Cost)  where Is Dead = true" },
      { label: "Carry cost",    expr: "Dead Stock Carry Cost  =  Dead Stock Value  ×  0.25  (25% annual rate)" },
    ],
    fields: [
      { name: "units_on_hand",    description: "Current quantity in stock",             required: true },
      { name: "unit_cost",        description: "Cost price per unit",                   required: true },
      { name: "units_sold_30d",   description: "Units sold/consumed in the last 30 days", required: true },
    ],
    example: {
      context: "SKU: WIDGET-007 — 150 units on hand, $12.50 unit cost, 0 units sold in 30 days",
      steps: [
        { label: "Monthly usage",          value: "0 units — qualifies as dead stock" },
        { label: "Dead stock value",       value: "150 × $12.50 = $1,875" },
        { label: "Annual carrying cost",   value: "$1,875 × 25% = $468.75/yr" },
      ],
      result: "$1,875 locked in dead inventory costing $469/yr to store",
      note: "If the item has not sold for 6+ months, liquidation at even 30% of cost recovers $562 and eliminates the carry cost.",
    },
    interpretation: {
      good:     "Dead stock < 3% of total inventory value. Capital is deployed in moving inventory.",
      warning:  "Dead stock 3–10% of total value. Review these SKUs quarterly; consider promotional pricing or returns to supplier.",
      critical: "Dead stock > 10% of total value. Immediate liquidation programme recommended — each month adds 2% in carrying costs.",
      tip:      "Sort dead stock by value descending. Prioritise highest-value items first for fastest capital recovery.",
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
    tagline: "SKUs that will run out before you can restock them",
    definition:
      "A SKU is at stockout risk when its days of remaining stock falls below the supplier lead time. This means a purchase order placed today would not arrive before the stock runs out — resulting in lost sales, production downtime, or customer churn. The risk score (0–100) weights velocity, days remaining, and ABC class.",
    formula: [
      { label: "Daily velocity",       expr: "Daily Velocity  =  Units Sold 30d  ÷  30" },
      { label: "Days remaining",       expr: "Days of Stock  =  Units on Hand  ÷  Daily Velocity" },
      { label: "Stockout risk flag",   expr: "At Risk  =  Days of Stock  <  Lead Time (days)" },
      { label: "Risk score",           expr: "Risk Score  =  100 × (1 − Days of Stock ÷ Lead Time)  [clamped 0–100]" },
      { label: "CRITICAL threshold",   expr: "CRITICAL  =  Days of Stock  <  Lead Time  ×  1.0" },
      { label: "WATCH threshold",      expr: "WATCH     =  Days of Stock  <  Lead Time  ×  1.5" },
    ],
    fields: [
      { name: "units_on_hand",    description: "Current quantity in stock",               required: true },
      { name: "units_sold_30d",   description: "Units sold in the last 30 days",          required: true },
      { name: "lead_time_days",   description: "Supplier delivery lead time in days",     required: true },
      { name: "unit_cost",        description: "For calculating financial impact",        required: false },
    ],
    example: {
      context: "SKU: MOTOR-3HP — 45 units on hand, 15 units sold last 30 days, 21-day lead time",
      steps: [
        { label: "Daily velocity",     value: "15 ÷ 30 = 0.5 units/day" },
        { label: "Days of stock",      value: "45 ÷ 0.5 = 90 days" },
        { label: "Lead time",          value: "21 days" },
        { label: "Status",             value: "90 > 21 → HEALTHY (no risk)" },
      ],
      result: "HEALTHY — 90 days of stock vs 21-day lead time",
      note: "If stock dropped to 9 units: 9 ÷ 0.5 = 18 days < 21-day LT → CRITICAL. Risk score = 100 × (1 − 18/21) = 14.",
    },
    interpretation: {
      good:     "CRITICAL count = 0. All SKUs have sufficient buffer above their lead time.",
      warning:  "1-5 CRITICAL SKUs. Review replenishment parameters, demand assumptions and recent purchasing decisions for those items.",
      critical: "6+ CRITICAL SKUs or any A-class item at risk. Potential production stoppage or annual consumption value loss.",
      tip:      "Safety stock formula: SS = Z-score × StdDev × √Lead Time. For 95% service level, Z = 1.65.",
    },
    linkedKPIs: ["reorder_count", "health_score"],
  },

  abc_analysis: {
    key: "abc_analysis",
    title: "ABC Analysis",
    tagline: "Pareto-based classification — focus effort where it drives the most value",
    definition:
      "ABC Analysis applies the Pareto principle to inventory. SKUs are ranked by annual consumption value and divided into three classes: A-items (top 70% of annual consumption value), B-items (next 20%), and C-items (bottom 10%). This drives differentiated inventory policies — tighter control for A-items, lean buffers for C-items.",
    formula: [
      { label: "SKU annual consumption value contribution", expr: "SKU Annual Consumption Value  =  Units Sold 30d  ×  12  ×  Unit Price  (annualised)" },
      { label: "Sort descending",          expr: "Rank SKUs by SKU Annual Consumption Value from highest → lowest" },
      { label: "Cumulative %",             expr: "Cumulative %  =  Running Sum of Annual Consumption Value  ÷  Total Annual Consumption Value  ×  100" },
      { label: "Assign class",             expr: "A = cumulative ≤ 70%   |   B = 70% < cumulative ≤ 90%   |   C = cumulative > 90%" },
    ],
    fields: [
      { name: "units_sold_30d", description: "Monthly sales velocity — proxy for annual demand", required: true },
      { name: "unit_price",     description: "Selling price per unit for annual consumption value calculation",   required: true },
      { name: "unit_cost",      description: "Used as fallback if unit_price is absent",         required: false },
    ],
    example: {
      context: "4-SKU portfolio",
      steps: [
        { label: "SKU Alpha — $8,000/yr  (cum: 53%)",  value: "→ A-class" },
        { label: "SKU Beta  — $4,500/yr  (cum: 83%)",  value: "→ B-class" },
        { label: "SKU Gamma — $2,000/yr  (cum: 96%)",  value: "→ C-class" },
        { label: "SKU Delta — $600/yr   (cum: 100%)",  value: "→ C-class" },
      ],
      result: "1 A-item drives 53% of annual consumption value; 1 B-item adds 30%; 2 C-items share 17%",
      note: "A-class: never stockout, safety stock 2×. B-class: monthly review. C-class: lean JIT ordering.",
    },
    interpretation: {
      good:     "A-items represent 60–80% of annual consumption value with ≤ 20% of SKUs — healthy Pareto split.",
      warning:  "A-items < 50% of annual consumption value or > 30% of SKUs — demand may be fragmented or pricing needs review.",
      critical: "No clear concentration — all items generate similar annual consumption value. ABC loses its value; re-examine product mix.",
      tip:      "Never let an A-class item reach stockout. Set minimum safety stock of 2× lead time for all A SKUs.",
    },
    linkedKPIs: ["inventory_value", "stockout_risk", "health_score"],
  },

  health_score: {
    key: "health_score",
    title: "Inventory Health Score",
    tagline: "Single 0–100 composite score for your entire inventory portfolio",
    definition:
      "The Inventory Health Score is a weighted composite of four independent sub-scores, each measuring a critical dimension of inventory management quality. 100 = perfect health. The score is designed to surface the most important problem area at a glance and guide prioritised action.",
    formula: [
      { label: "Dead Stock sub-score",       expr: "Dead Score = 100 - (dead_stock_pct x 2); weighted by active InventoryPolicy" },
      { label: "Slow Mover sub-score",       expr: "Slow Score = 100 - (slow_mover_pct x 2); weighted by active InventoryPolicy" },
      { label: "Stockout sub-score",         expr: "Stockout Score = 100 - (stockout_risk_pct x 2.5); weighted by active InventoryPolicy" },
      { label: "ABC profile",                 expr: "Neutral/informational when its active weight is 0; normal Pareto concentration is not penalised" },
      { label: "Composite score",             expr: "Health Score = sum(factor score x active InventoryPolicy weight); active weights must total 100%" },
    ],
    fields: [
      { name: "units_on_hand",    description: "Required for all sub-scores",              required: true },
      { name: "unit_cost",        description: "Required for value-based sub-scores",      required: true },
      { name: "units_sold_30d",   description: "Required for velocity and stockout",       required: true },
      { name: "lead_time_days",   description: "Required for stockout sub-score",          required: true },
      { name: "unit_cost",        description: "Cost basis for annual consumption value",       required: true },
    ],
    example: {
      context: "Portfolio with 200 SKUs, $500K inventory value",
      steps: [
        { label: "Dead stock = 8% → Dead score",    value: "100 × (1 − 0.08) = 92" },
        { label: "Slow movers = 18% → Slow score",  value: "100 × (1 − 0.18) = 82" },
        { label: "12 SKUs at risk (6%) → Stk score", value: "100 × (1 − 0.06) = 94" },
        { label: "ABC profile", value: "Informational only when active weight = 0" },
        { label: "Composite",   value: "Use active InventoryPolicy weights; e.g. 84x0.30 + 78x0.25 + 85x0.45 = 83" },
      ],
      result: "Health Score: 86 / 100 — Good",
      note: "The slow mover sub-score (82) is the weakest link here — reducing slow movers would have the biggest impact.",
    },
    interpretation: {
      good:     "80–100: Healthy. Inventory is well-managed. Monitor monthly and focus on continuous optimisation.",
      warning:  "60–79: Needs attention. One or two sub-scores are dragging the composite. Identify and fix the weakest factor.",
      critical: "< 60: Critical. Multiple inventory problems are active simultaneously. Prioritise immediate action plan.",
      tip:      "Improve the lowest sub-score first — it has the largest marginal impact on the composite.",
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
      { label: "Weighted score",     expr: "Ageing Score  =  Σ (bucket_pct_value × bucket_weight)  ÷  100" },
      { label: "Dead stock penalty", expr: "Final Score  =  Ageing Score × (1 − dead_stock_pct × 0.5)" },
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
      "Estimated Recoverable Capital is a policy-based estimate of value that may be recoverable from dead stock and slow-moving excess stock. It is subject to recovery-rate and target-coverage assumptions and should not be treated as guaranteed cash recovery.",
    formula: [
      { label: "Non-performing inventory",       expr: "Non-Performing Inventory Value = Dead Stock Value + Slow-Moving Inventory Value" },
      { label: "Estimated dead-stock recovery",  expr: "Dead Recovery = Dead Stock Value x active dead_stock_recovery_rate" },
      { label: "Estimated slow-moving recovery", expr: "Slow Recovery = Slow-Moving Excess Value x active slow_moving_recovery_rate" },
      { label: "Estimated recoverable capital", expr: "Estimated Recoverable Capital = Estimated Dead-Stock Recovery + Estimated Slow-Moving Excess Recovery" },
    ],
    fields: [
      { name: "units_on_hand",    description: "Stock quantities for excess calculation", required: true },
      { name: "unit_cost",        description: "Cost basis for recovery-rate calculation", required: true },
      { name: "units_sold_30d",   description: "Units consumed, issued or sold during a typical 30-day period", required: true },
    ],
    example: {
      context: "Dead stock value and slow-moving excess value with active recovery-rate policy assumptions",
      steps: [
        { label: "Non-performing inventory", value: "Dead Stock Value + Slow-Moving Inventory Value" },
        { label: "Estimated dead-stock recovery", value: "Dead Stock Value x active recovery rate" },
        { label: "Estimated slow-moving recovery", value: "Slow-Moving Excess Value x active recovery rate" },
      ],
      result: "Estimated recovery is policy-based and subject to recovery-rate and excess-stock assumptions",
      note: "Actual recovery depends on product condition, market demand, channel, supplier terms and execution.",
    },
    interpretation: {
      good:     "Estimated recoverable capital is low relative to total inventory value.",
      warning:  "Moderate estimated recoverable capital. Review affected items, recovery assumptions and replenishment settings.",
      critical: "High estimated recoverable capital. This may indicate material non-performing inventory, subject to policy recovery assumptions.",
      tip:      "Treat this as an estimate, not guaranteed cash. Validate recovery rates, excess-stock assumptions and item-level disposition options before acting.",
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
    tagline: "SKUs that need a purchase order placed now or soon",
    definition:
      "The reorder count is the number of SKUs whose on-hand stock has fallen at or below their calculated Reorder Point (ROP). The ROP accounts for demand during lead time plus a safety stock buffer. SKUs above this threshold are in the reorder zone and require a purchase order to maintain service levels.",
    formula: [
      { label: "Reorder point",    expr: "ROP  =  (Daily Velocity × Lead Time)  +  Safety Stock" },
      { label: "Safety stock",     expr: "Safety Stock  =  Daily Velocity × 15  (≈ 0.5 months buffer)" },
      { label: "Reorder flag",     expr: "Needs Reorder  =  Units on Hand  ≤  ROP" },
      { label: "EOQ",              expr: "EOQ  =  √(2 × Annual Demand × Order Cost ÷ (Unit Cost × Holding Rate))" },
    ],
    fields: [
      { name: "units_on_hand",    description: "Current stock to compare against ROP",         required: true },
      { name: "units_sold_30d",   description: "Velocity for ROP and EOQ calculation",         required: true },
      { name: "lead_time_days",   description: "Lead time for reorder point calculation",       required: true },
      { name: "unit_cost",        description: "Unit cost for EOQ holding cost component",      required: true },
    ],
    example: {
      context: "SKU: GASKET-22 — 80 units on hand, 20 units/month, 14-day lead time",
      steps: [
        { label: "Daily velocity",       value: "20 ÷ 30 = 0.667 units/day" },
        { label: "Safety stock",         value: "0.667 × 15 = 10 units" },
        { label: "Reorder point",        value: "(0.667 × 14) + 10 = 9.3 + 10 = 19 units" },
        { label: "On-hand vs ROP",       value: "80 > 19 → NOT in reorder zone yet" },
      ],
      result: "GASKET-22 is healthy — reorder when stock drops to 19 units",
      note: "If on-hand were 15 units (< ROP 19), it would be flagged as REORDER NEEDED.",
    },
    interpretation: {
      good:     "Reorder count ≤ 5% of SKUs. Ordering is proactive and stockouts are being prevented.",
      warning:  "5–15% of SKUs need reordering. Review lead times and ordering frequency — you may be under-ordering.",
      critical: "> 15% of SKUs need reorders. Systematic purchasing gap. Immediate PO batch required.",
      tip:      "Use the Export PO Draft feature to generate a purchase order CSV for all reorder-needed SKUs at once.",
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
      { label: "Value-weighted ageing days",  expr: "Avg Ageing Days  =  Σ (Ageing Days × Item Value)  ÷  Σ (Item Value)" },
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
      good:     "≤ 60 days: Fresh stock. Most value received recently with high sell-through.",
      warning:  "61–120 days: Moderate ageing. Some slow-movers building up. Review high-value aged items.",
      critical: "> 120 days: Significant ageing. High risk of obsolescence and quality degradation.",
      tip:      "Sort items by (ageing_days × unit_cost) descending to find the highest-impact items to address first.",
    },
    linkedKPIs: ["ageing_score", "blocked_capital"],
  },
};







