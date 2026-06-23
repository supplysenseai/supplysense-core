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
  fields: { name: string; description: string; required: boolean }[];
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
  };
  linkedKPIs?: KPIKey[];
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
      good:     "Value is proportional to your revenue and turnover rate — stock turns quickly and capital works hard.",
      warning:  "High value relative to monthly sales suggests overstocking or slow-moving items absorbing working capital.",
      critical: "Inventory value growing while revenue stays flat is a cash-flow warning sign requiring immediate SKU review.",
      tip:      "Compare Inventory Value against your monthly COGS. If the ratio exceeds 3 months, investigate dead and slow stock.",
    },
    linkedKPIs: ["dead_stock", "slow_moving", "turnover_ratio"],
  },

  dead_stock: {
    key: "dead_stock",
    title: "Dead Stock",
    tagline: "Items with zero movement — cash trapped with no return",
    definition:
      "Dead stock comprises SKUs that have recorded zero sales velocity in the last 30 days AND still hold units on hand. These items are generating carrying costs with no revenue offset and are the highest-priority candidates for liquidation, write-down, or redeployment.",
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
    tagline: "Stock at risk of becoming dead — act before it's too late",
    definition:
      "Slow-moving SKUs are items with more than 6 months of stock on hand based on current velocity. They are not yet dead (some movement exists) but are consuming disproportionate carrying cost relative to their sales contribution. Early intervention avoids permanent dead-stock write-offs.",
    formula: [
      { label: "Monthly velocity",    expr: "Monthly Usage  =  Units Sold in 30 days" },
      { label: "Months of stock",     expr: "Months of Stock  =  Units on Hand  ÷  Monthly Usage" },
      { label: "Slow mover flag",     expr: "Is Slow Mover  =  (Months of Stock > 6)  AND  (Monthly Usage > 0)" },
      { label: "Slow mover value",    expr: "Slow Mover Value  =  Σ (Units on Hand × Unit Cost)  where Is Slow = true" },
    ],
    fields: [
      { name: "units_on_hand",  description: "Current quantity in stock",             required: true },
      { name: "unit_cost",      description: "Cost price per unit",                   required: true },
      { name: "units_sold_30d", description: "Units sold/consumed in the last 30 days", required: true },
    ],
    example: {
      context: "SKU: BOLT-M8 — 1,200 units on hand, $0.85 unit cost, 40 units sold last 30 days",
      steps: [
        { label: "Monthly usage",          value: "40 units/month" },
        { label: "Months of stock",        value: "1,200 ÷ 40 = 30 months (2.5 years!)" },
        { label: "Slow mover threshold",   value: "> 6 months → flagged SLOW" },
        { label: "Inventory value",        value: "1,200 × $0.85 = $1,020" },
        { label: "Annual carry cost",      value: "$1,020 × 25% = $255/yr" },
      ],
      result: "30 months of stock — 24 excess months that should be reduced",
      note: "Optimal stock would be 6 months × 40 units = 240 units. Excess: 960 units = $816 in over-investment.",
    },
    interpretation: {
      good:     "Slow movers < 10% of inventory value. Ordering cadence is well-calibrated.",
      warning:  "10–25% slow movers. Review purchase orders — over-ordering or demand drop. Explore promotional discounts.",
      critical: "> 25% slow movers. Systematic over-procurement or major demand shift. Reforecast all top slow movers immediately.",
      tip:      "Set a reorder point for slow movers that targets 2–3 months of stock rather than the default 6-month buffer.",
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
      warning:  "1–5 CRITICAL SKUs. Place emergency purchase orders immediately for those items.",
      critical: "6+ CRITICAL SKUs or any A-class item at risk. Potential production stoppage or revenue loss.",
      tip:      "Safety stock formula: SS = Z-score × StdDev × √Lead Time. For 95% service level, Z = 1.65.",
    },
    linkedKPIs: ["reorder_count", "health_score"],
  },

  abc_analysis: {
    key: "abc_analysis",
    title: "ABC Analysis",
    tagline: "Pareto-based classification — focus effort where it drives the most value",
    definition:
      "ABC Analysis applies the Pareto principle to inventory. SKUs are ranked by total revenue contribution and divided into three classes: A-items (top 70% of revenue), B-items (next 20%), and C-items (bottom 10%). This drives differentiated inventory policies — tighter control for A-items, lean buffers for C-items.",
    formula: [
      { label: "SKU revenue contribution", expr: "SKU Revenue  =  Units Sold 30d  ×  12  ×  Unit Price  (annualised)" },
      { label: "Sort descending",          expr: "Rank SKUs by SKU Revenue from highest → lowest" },
      { label: "Cumulative %",             expr: "Cumulative %  =  Running Sum of Revenue  ÷  Total Revenue  ×  100" },
      { label: "Assign class",             expr: "A = cumulative ≤ 70%   |   B = 70% < cumulative ≤ 90%   |   C = cumulative > 90%" },
    ],
    fields: [
      { name: "units_sold_30d", description: "Monthly sales velocity — proxy for annual demand", required: true },
      { name: "unit_price",     description: "Selling price per unit for revenue calculation",   required: true },
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
      result: "1 A-item drives 53% of revenue; 1 B-item adds 30%; 2 C-items share 17%",
      note: "A-class: never stockout, safety stock 2×. B-class: monthly review. C-class: lean JIT ordering.",
    },
    interpretation: {
      good:     "A-items represent 60–80% of revenue with ≤ 20% of SKUs — healthy Pareto split.",
      warning:  "A-items < 50% of revenue or > 30% of SKUs — demand may be fragmented or pricing needs review.",
      critical: "No clear concentration — all items generate similar revenue. ABC loses its value; re-examine product mix.",
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
      { label: "Dead Stock sub-score (30%)",  expr: "Dead Score  =  100 × (1 − Dead Stock Value ÷ Total Inventory Value)" },
      { label: "Slow Mover sub-score (25%)",  expr: "Slow Score  =  100 × (1 − Slow Mover Value ÷ Total Inventory Value)" },
      { label: "Stockout sub-score (30%)",    expr: "Stockout Score  =  100 × (1 − Stockout Risk Count ÷ Total SKUs)" },
      { label: "ABC sub-score (15%)",         expr: "ABC Score  =  A-item Revenue %  (higher A-concentration = better)" },
      { label: "Composite score",             expr: "Health Score  =  Dead×0.30 + Slow×0.25 + Stockout×0.30 + ABC×0.15" },
    ],
    fields: [
      { name: "units_on_hand",    description: "Required for all sub-scores",              required: true },
      { name: "unit_cost",        description: "Required for value-based sub-scores",      required: true },
      { name: "units_sold_30d",   description: "Required for velocity and stockout",       required: true },
      { name: "lead_time_days",   description: "Required for stockout sub-score",          required: true },
      { name: "unit_price",       description: "Required for ABC revenue classification",  required: false },
    ],
    example: {
      context: "Portfolio with 200 SKUs, $500K inventory value",
      steps: [
        { label: "Dead stock = 8% → Dead score",    value: "100 × (1 − 0.08) = 92" },
        { label: "Slow movers = 18% → Slow score",  value: "100 × (1 − 0.18) = 82" },
        { label: "12 SKUs at risk (6%) → Stk score", value: "100 × (1 − 0.06) = 94" },
        { label: "A-items = 65% revenue → ABC score", value: "65" },
        { label: "Composite",                        value: "92×0.30 + 82×0.25 + 94×0.30 + 65×0.15 = 85.9" },
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
      { name: "ageing_days",  description: "Days since the item entered the warehouse",   required: true },
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
    title: "Recoverable Capital",
    tagline: "Cash you can unlock by liquidating dead and slow-moving stock",
    definition:
      "Recoverable Capital estimates the cash that could be freed by liquidating dead stock and reducing slow movers to optimal levels. It assumes a recovery rate based on item condition and market demand — dead stock at 30–50% of cost, slow movers at 60–80%. This is the actionable financial upside of an inventory optimisation programme.",
    formula: [
      { label: "Dead stock recovery",     expr: "Dead Recovery  =  Dead Stock Value  ×  0.40  (40% liquidation rate)" },
      { label: "Slow mover reduction",    expr: "Slow Recovery  =  Excess Slow Stock Value  ×  0.70  (70% recovery)" },
      { label: "Recoverable capital",     expr: "Recoverable Capital  =  Dead Recovery + Slow Recovery" },
    ],
    fields: [
      { name: "units_on_hand",    description: "Stock quantities for excess calculation", required: true },
      { name: "unit_cost",        description: "Cost basis for recovery rate calculation", required: true },
      { name: "units_sold_30d",   description: "Velocity for excess stock calculation",   required: true },
    ],
    example: {
      context: "Dead stock: $20,000 | Slow mover excess: $35,000",
      steps: [
        { label: "Dead stock recovery (40%)",    value: "$20,000 × 0.40 = $8,000" },
        { label: "Slow mover recovery (70%)",    value: "$35,000 × 0.70 = $24,500" },
        { label: "Total recoverable capital",    value: "$32,500" },
      ],
      result: "$32,500 could be freed — reducing working capital needs and improving cash flow",
      note: "Actual recovery rate depends on product type, market conditions, and liquidation channel (eBay, returns, B-stock).",
    },
    interpretation: {
      good:     "Recoverable capital < 5% of total inventory value. Capital efficiency is high.",
      warning:  "5–15% of total value recoverable. A focused 30-day liquidation push would meaningfully improve cash flow.",
      critical: "> 15% of total value stuck in recoverable items. This represents a significant working capital inefficiency.",
      tip:      "Run a structured liquidation sale, return-to-vendor negotiation, or B2B surplus sale for fastest capital recovery.",
    },
    linkedKPIs: ["dead_stock", "slow_moving"],
  },

  turnover_ratio: {
    key: "turnover_ratio",
    title: "Inventory Turnover Ratio",
    tagline: "How many times your inventory is sold and replaced per year",
    definition:
      "The inventory turnover ratio measures how efficiently inventory is being sold and replaced. A higher ratio means faster-moving stock and better capital utilisation. It is the primary efficiency benchmark for supply chain performance and the basis for Days of Inventory on Hand (DOH) calculations.",
    formula: [
      { label: "Annual COGS (proxy)",  expr: "Annual COGS  =  Σ (Units Sold 30d × Unit Cost × 12)  for all SKUs" },
      { label: "Turnover ratio",       expr: "Turnover Ratio  =  Annual COGS  ÷  Total Inventory Value" },
      { label: "Days on hand",         expr: "Days of Inventory  =  365  ÷  Turnover Ratio" },
    ],
    fields: [
      { name: "units_on_hand",    description: "Denominator — current inventory investment",   required: true },
      { name: "unit_cost",        description: "For both COGS and inventory value calculation", required: true },
      { name: "units_sold_30d",   description: "Monthly velocity for annualised COGS proxy",   required: true },
    ],
    example: {
      context: "Total inventory value $250,000 | Annual COGS $1,125,000",
      steps: [
        { label: "Annual COGS (monthly × 12)",  value: "$93,750 × 12 = $1,125,000" },
        { label: "Total inventory value",        value: "$250,000" },
        { label: "Turnover ratio",               value: "$1,125,000 ÷ $250,000 = 4.5×" },
        { label: "Days of inventory",            value: "365 ÷ 4.5 = 81 days" },
      ],
      result: "4.5× — exactly at US Manufacturing benchmark",
      note: "Retail average is 8×; Electronics 5.5×. Compare your ratio to your industry benchmark on the Turnover page.",
    },
    interpretation: {
      good:     "≥ 6×: Strong. Inventory cycles quickly, capital works hard, storage costs are minimised.",
      warning:  "3–6×: Average. In range for manufacturing but below retail norms. Room to optimise slow SKUs.",
      critical: "< 3×: Weak. Inventory is turning very slowly — likely significant dead and slow-moving stock present.",
      tip:      "Each 1× improvement in turnover on $500K inventory frees approximately $83K in working capital.",
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
      { name: "ageing_days",  description: "Days in warehouse for each item",              required: true },
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
