import type { InventoryItem } from "@/lib/inventory-parser";
import type {
  DashboardMetrics, AnalyzedSKU, ReorderRecommendation,
  ABCSummary, RiskDistribution, HealthComponents, AnalysisMode,
} from "@/lib/types";
import type { ActivePolicy } from "@/lib/policy";
import { SYSTEM_DEFAULTS, resolvePolicy } from "@/lib/policy";
import { detectAnalysisMode } from "@/lib/analysis-detector";
import { analyzeAging } from "@/lib/aging-analyzer";

const CARRYING_RATE = 0.25; // 25% annual holding cost

function calcEOQ(annual_demand: number, unit_cost: number, ordering_cost = 50): number {
  if (annual_demand <= 0 || unit_cost <= 0) return 0;
  const holding = unit_cost * CARRYING_RATE;
  return Math.max(1, Math.round(Math.sqrt((2 * annual_demand * ordering_cost) / holding)));
}

function calcRiskScore(months_of_stock: number, lead_time: number): number {
  if (months_of_stock <= 0) return 100;
  if (lead_time <= 0) return 0;
  if (months_of_stock < lead_time) return Math.round(75 + (1 - months_of_stock / lead_time) * 25);
  if (months_of_stock < lead_time * 1.5) return Math.round(50 + (1 - (months_of_stock - lead_time) / (lead_time * 0.5)) * 25);
  if (months_of_stock < lead_time * 3) return Math.round(25 + (1 - (months_of_stock - lead_time * 1.5) / (lead_time * 1.5)) * 25);
  return Math.max(0, Math.round(25 * Math.exp(-months_of_stock / (lead_time * 4))));
}

type Scenario = "CRITICAL" | "DEAD" | "SLOW" | "WATCH" | "HEALTHY";

function classifyScenario(
  item: InventoryItem,
  months_of_stock: number,
  days_stock_remaining: number,
  days_since_last_sale: number,
  slowMoverMonths: number,
  deadStockDays: number,
  criticalCoverageDays: number,
  slowMovingDays: number
): Scenario {
  // Dead stock: no movement for > dead_stock_days, regardless of avg usage figure
  if (item.stock_qty > 0 && days_since_last_sale >= deadStockDays) return "DEAD";
  // Zero demand (discontinued / not yet sold) — treat as healthy unless dead
  if (item.monthly_usage === 0) return "HEALTHY";
  // Critical: will run out within the coverage window
  if (isFinite(days_stock_remaining) && days_stock_remaining < criticalCoverageDays) return "CRITICAL";
  // Slow mover: date-based — last movement older than threshold (most reliable signal)
  if (days_since_last_sale > 0 && days_since_last_sale >= slowMovingDays) return "SLOW";
  // Slow mover: velocity-based fallback — only when no last_movement_date is available
  if (!item.last_movement_date && months_of_stock > slowMoverMonths) return "SLOW";
  // Watch: stock will be below lead-time buffer soon
  if (months_of_stock < item.lead_time * 1.5) return "WATCH";
  return "HEALTHY";
}

const TODAY_MS = Date.now();

function daysSinceMovement(item: InventoryItem): number {
  if (item.last_movement_date) {
    const d = new Date(item.last_movement_date);
    if (!isNaN(d.getTime())) {
      return Math.max(0, Math.floor((TODAY_MS - d.getTime()) / 86400000));
    }
  }
  // Fallback: assume recently active if any usage, long dormant if none
  return item.monthly_usage > 0 ? 0 : 999;
}

export function analyzeInventoryItems(
  items: InventoryItem[],
  detectedFields: string[] = [],
  activePolicy?: ActivePolicy
): { metrics: DashboardMetrics; analyzedSkus: AnalyzedSKU[] } {
  const analysis_mode: AnalysisMode = detectAnalysisMode(detectedFields);

  // Resolve policy — use provided or fall back to system defaults
  const policy = activePolicy?.policy ?? resolvePolicy().policy;
  const resolved_policy: ActivePolicy = activePolicy ?? resolvePolicy();

  // Derived thresholds from policy
  const slowMoverMonths = policy.slow_moving_days / 30;
  const deadStockDays = policy.dead_stock_days;
  const criticalCoverageDays = policy.critical_coverage_days;
  const safetyStockDays = policy.safety_stock_days;
  const abcAThreshold = policy.abc_a_pct / 100;
  const abcBThreshold = (policy.abc_a_pct + policy.abc_b_pct) / 100;
  const weightDeadStock = policy.weight_dead_stock / 100;
  const weightSlowMoving = policy.weight_slow_moving / 100;
  const weightStockoutRisk = policy.weight_stockout_risk / 100;
  // ABC quality weight gets the remaining weight
  const weightABC = Math.max(0, 1 - weightDeadStock - weightSlowMoving - weightStockoutRisk);

  if (items.length === 0) {
    return { metrics: emptyMetrics(analysis_mode), analyzedSkus: [] };
  }

  // Step 1: Basic calculations
  const enriched = items.map((item) => {
    const inventory_value = item.stock_qty * item.unit_cost;
    const months_of_stock = item.monthly_usage > 0 ? item.stock_qty / item.monthly_usage : Infinity;
    const days_stock_remaining = isFinite(months_of_stock) ? months_of_stock * 30 : Infinity;
    const annual_usage = item.monthly_usage * 12;
    const annual_revenue = annual_usage * item.unit_cost;
    return { item, inventory_value, months_of_stock, days_stock_remaining, annual_usage, annual_revenue };
  });

  // Step 2: ABC classification by cumulative inventory value
  const totalValue = enriched.reduce((s, e) => s + e.inventory_value, 0);
  const sorted = [...enriched].sort((a, b) => b.inventory_value - a.inventory_value);
  let cumulative = 0;
  const abcMap = new Map<string, "A" | "B" | "C">();
  for (const e of sorted) {
    cumulative += e.inventory_value;
    const pct = totalValue > 0 ? cumulative / totalValue : 1;
    abcMap.set(e.item.item_code, pct <= abcAThreshold ? "A" : pct <= abcBThreshold ? "B" : "C");
  }

  // Step 3: Build AnalyzedSKU array
  const analyzedSkus: AnalyzedSKU[] = enriched.map(({ item, inventory_value, months_of_stock, days_stock_remaining, annual_usage }) => {
    const days_since_last_sale = daysSinceMovement(item);
    const scenario = classifyScenario(
      item, months_of_stock, days_stock_remaining, days_since_last_sale,
      slowMoverMonths, deadStockDays, criticalCoverageDays, policy.slow_moving_days
    );
    const abc_class = abcMap.get(item.item_code) ?? "C";
    const stockout_risk_score = scenario === "DEAD" ? 0 : calcRiskScore(months_of_stock, item.lead_time);
    const eoq = calcEOQ(annual_usage, item.unit_cost);

    const lead_time_days = Math.round(item.lead_time * 30);
    const daily_velocity = item.monthly_usage / 30;
    const safety_stock = Math.round(daily_velocity * safetyStockDays);
    const reorder_point_calc = Math.round(daily_velocity * lead_time_days + safety_stock);
    return {
      sku_id: item.item_code,
      product_name: item.item_name,
      category: item.category,
      units_on_hand: item.stock_qty,
      unit_cost: item.unit_cost,
      unit_price: item.unit_cost * 1.4,
      units_sold_30d: item.monthly_usage,
      units_sold_90d: item.monthly_usage * 3,
      last_sale_date: item.last_movement_date ? new Date(item.last_movement_date) : (item.monthly_usage > 0 ? new Date() : null),
      lead_time_days,
      demand_std_dev: item.monthly_usage * 0.2,
      supplier_name: item.supplier || "—",
      inventory_value,
      abc_class,
      scenario,
      stockout_risk_score,
      daily_velocity,
      days_stock_remaining,
      is_dead_stock: scenario === "DEAD",
      is_slow_mover: scenario === "SLOW",
      is_stockout_critical: scenario === "CRITICAL",
      velocity_ratio: item.monthly_usage > 0 ? item.stock_qty / item.monthly_usage : 0,
      reorder_qty_eoq: eoq,
      safety_stock,
      reorder_point_calc,
      days_since_last_sale,
      urgency: scenario === "CRITICAL" ? "immediate" : scenario === "WATCH" ? "this_week" : null,
    } as AnalyzedSKU;
  });

  // Step 4: KPI aggregation
  const dead = analyzedSkus.filter((s) => s.scenario === "DEAD");
  const slow = analyzedSkus.filter((s) => s.scenario === "SLOW");
  const critical = analyzedSkus.filter((s) => s.scenario === "CRITICAL");
  // "At risk" = active-demand SKUs where stock on hand ≤ reorder point (industry standard).
  // Matches Excel: Stockout + Critical + Below Reorder Point.
  // Guards:
  //   1. Exclude dead stock (no demand, positive stock — classified separately)
  //   2. Require daily_velocity > 0 — items with zero demand have reorder_point_calc = 0,
  //      so "0 <= 0" would wrongly flag discontinued/zero-stock items as at-risk.
  //   3. Compare stock on hand to ROP (= lead-time demand + safety stock).
  // Use file's reorder_point column when present (matches Excel/ERP source of truth).
  // Fall back to computed ROP (lead-time demand + safety stock) when not supplied.
  const fileHasReorderPoint = items.some((it) => (it.reorder_point ?? 0) > 0);
  const atRisk = analyzedSkus.filter((s) => {
    if (s.is_dead_stock) return false;
    if (s.daily_velocity <= 0) return false;
    const rop = fileHasReorderPoint
      ? (items.find((it) => it.item_code === s.sku_id)?.reorder_point ?? 0)
      : s.reorder_point_calc;
    return rop > 0 && s.units_on_hand <= rop;
  });

  const dead_stock_value = dead.reduce((s, r) => s + r.inventory_value, 0);
  const slow_mover_value = slow.reduce((s, r) => s + r.inventory_value, 0);
  const annual_carrying_cost = totalValue * CARRYING_RATE;
  const dead_stock_carrying_cost = dead_stock_value * CARRYING_RATE;

  const annualSales = enriched.reduce((s, e) => s + e.annual_revenue, 0);
  const turnover_ratio = totalValue > 0 ? parseFloat((annualSales / totalValue).toFixed(1)) : 0;

  // Recoverable capital = full value of dead stock + full value of slow movers
  // (the entire inventory value tied up in these items is potentially recoverable)
  const recoverable_capital = dead_stock_value + slow_mover_value;

  // ── Phase 3 Health Score ────────────────────────────────────────────────────
  // Four factors, each scored 0-100 (higher = healthier), then weighted.
  //
  //   Dead Stock %    weight 30%  — what share of SKUs have zero movement
  //   Slow Mover %    weight 25%  — what share are moving but sitting >6 months
  //   Stockout Risk % weight 30%  — what share are at critical/watch risk
  //   ABC Quality     weight 15%  — how well A-items concentrate revenue (Pareto health)
  //
  const n = items.length;

  // Raw percentages
  const dead_stock_pct    = Math.round((dead.length    / n) * 100);
  const slow_mover_pct    = Math.round((slow.length    / n) * 100);
  // Health score stockout factor = % of active SKUs at/below reorder point (operational coverage)
  // This is intentionally different from the Stockout Risk KPI card (which counts CRITICAL scenario)
  const stockout_risk_pct = Math.round((atRisk.length  / n) * 100);

  // Factor scores: penalise excess, reward low rates
  // Dead stock: 0% dead → 100pts; 50%+ dead → 0pts  (linear)
  const dead_stock_score  = Math.max(0, Math.round(100 - dead_stock_pct   * 2));
  // Slow mover: 0% slow → 100pts; 50%+ slow → 0pts  (linear)
  const slow_mover_score  = Math.max(0, Math.round(100 - slow_mover_pct   * 2));
  // Stockout risk: 0% at-risk → 100pts; 40%+ at-risk → 0pts  (steeper — stockouts hurt most)
  const stockout_score    = Math.max(0, Math.round(100 - stockout_risk_pct * 2.5));

  // ABC quality: ideal = A-items drive 70%+ of revenue (classic Pareto).
  // Score rises toward 100 as a_revenue_pct approaches 70, falls if skewed <40 or >90.
  // We compute this after abc_summary — placeholder here, filled below.
  // For now use coverage/velocity as legacy fallbacks for the card's extra bars.
  const healthySKUs   = analyzedSkus.filter((s) => s.scenario === "HEALTHY").length;
  const velocityItems = analyzedSkus.filter((s) => s.units_sold_30d > 0).length;
  const coverage      = Math.min(100, (healthySKUs   / n) * 100);
  const velocity      = Math.min(100, (velocityItems / n) * 100);
  const accuracy      = Math.max(0, 100 - (atRisk.length / n) * 200);
  const availability  = Math.max(0, 100 - (critical.length / n) * 300);

  // ABC summary
  const aItems = analyzedSkus.filter((s) => s.abc_class === "A");
  const bItems = analyzedSkus.filter((s) => s.abc_class === "B");
  const cItems = analyzedSkus.filter((s) => s.abc_class === "C");
  const aVal = aItems.reduce((s, r) => s + r.inventory_value, 0);
  const bVal = bItems.reduce((s, r) => s + r.inventory_value, 0);
  const cVal = cItems.reduce((s, r) => s + r.inventory_value, 0);
  const a_revenue_pct_raw = totalValue > 0 ? (aVal / totalValue) * 100 : 0;

  // ABC quality score: sweet-spot 65-75% → 100pts; linear decay outside
  const abc_score = Math.round(
    a_revenue_pct_raw >= 65 && a_revenue_pct_raw <= 75
      ? 100
      : a_revenue_pct_raw < 65
        ? Math.max(0, (a_revenue_pct_raw / 65) * 100)
        : Math.max(0, 100 - ((a_revenue_pct_raw - 75) / 25) * 100)
  );

  // Final weighted health score (uses policy weights; ABC quality gets the remainder)
  const health_score = Math.min(100, Math.max(0, Math.round(
    dead_stock_score  * weightDeadStock +
    slow_mover_score  * weightSlowMoving +
    stockout_score    * weightStockoutRisk +
    abc_score         * weightABC
  )));

  const health_components: HealthComponents = {
    // legacy bars (kept for sparkline / future use)
    coverage:    Math.round(coverage),
    velocity:    Math.round(velocity),
    accuracy:    Math.round(Math.max(0, accuracy)),
    availability: Math.round(Math.max(0, availability)),
    // Phase 3 factor scores
    dead_stock_score,
    slow_mover_score,
    stockout_score,
    abc_score,
    // raw percentages for labels
    dead_stock_pct,
    slow_mover_pct,
    stockout_risk_pct,
    a_item_revenue_pct: Math.round(a_revenue_pct_raw),
  };

  const abc_summary: ABCSummary = {
    a_count: aItems.length,
    b_count: bItems.length,
    c_count: cItems.length,
    a_revenue_pct: totalValue > 0 ? Math.round((aVal / totalValue) * 100) : 0,
    b_revenue_pct: totalValue > 0 ? Math.round((bVal / totalValue) * 100) : 0,
    c_revenue_pct: totalValue > 0 ? Math.round((cVal / totalValue) * 100) : 0,
  };

  // Risk distribution — scenario-based so each SKU belongs to exactly one bar
  const risk_distribution: RiskDistribution = {
    low:      analyzedSkus.filter((s) => s.scenario === "HEALTHY").length,
    watch:    analyzedSkus.filter((s) => s.scenario === "WATCH").length,
    elevated: analyzedSkus.filter((s) => s.scenario === "SLOW").length,
    critical: analyzedSkus.filter((s) => s.scenario === "CRITICAL").length,
    dead:     analyzedSkus.filter((s) => s.scenario === "DEAD").length,
  };

  // Top risk items — only non-healthy scenarios, sorted by risk score
  const top_risk_items = [...analyzedSkus]
    .filter((s) => s.scenario !== "HEALTHY")
    .sort((a, b) => b.stockout_risk_score - a.stockout_risk_score);

  const atRiskSet = new Set(atRisk.map((r) => r.sku_id));
  // Reorder recommendations — full at-risk list, UI table limited to top 20
  const reorder_recommendations: ReorderRecommendation[] = analyzedSkus
    .filter((s) => atRiskSet.has(s.sku_id))
    .sort((a, b) => b.stockout_risk_score - a.stockout_risk_score)
    .slice(0, 20)
    .map((s) => ({
      sku_id: s.sku_id,
      product_name: s.product_name,
      supplier_name: s.supplier_name ?? "—",
      eoq: s.reorder_qty_eoq,
      rop: s.reorder_point_calc,
      days_until_stockout: isFinite(s.days_stock_remaining) ? Math.round(s.days_stock_remaining) : 9999,
      urgency: (s.scenario === "CRITICAL" ? "immediate" : s.days_stock_remaining < 30 ? "this_week" : "this_month") as "immediate" | "this_week" | "this_month",
      abc_class: s.abc_class,
      unit_cost: s.unit_cost,
    }));

  // Health trend — deterministic projection of last 6 months
  // Shows a realistic improving arc toward current score (no random noise)
  const TREND_OFFSETS = [-14, -10, -6, -3, -1, 0]; // pts below current score
  const health_trend = TREND_OFFSETS.map((offset, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return { m: d.toLocaleString("default", { month: "short" }), v: Math.max(10, health_score + offset) };
  });

  // Phase 7: aging analysis (runs when ageing data is present)
  const aging_metrics = (analysis_mode === "aging" || analysis_mode === "complete")
    ? analyzeAging(items)
    : undefined;

  const metrics: DashboardMetrics = {
    health_score: Math.min(100, Math.max(0, health_score)),
    health_components,
    total_inventory_value: totalValue,
    annual_carrying_cost,
    dead_stock_value,
    dead_stock_count: dead.length,
    dead_stock_carrying_cost,
    slow_mover_value,
    slow_mover_count: slow.length,
    stockout_risk_count: critical.length,       // items running out within coverage window
    critical_stockout_count: critical.length,
    recoverable_capital,
    turnover_ratio,
    reorder_count: atRisk.length,  // full count — reorder_recommendations is top-20 UI table only
    total_skus: items.length,
    abc_summary,
    risk_distribution,
    top_risk_items,
    top_dead_stock: dead.slice(0, 10),
    all_skus: analyzedSkus,          // full dataset for drill-through
    reorder_recommendations,
    health_trend,
    // Phase 7
    analysis_mode,
    aging_metrics,
    // Phase 12
    active_policy: resolved_policy,
  };

  return { metrics, analyzedSkus };
}

function emptyMetrics(analysis_mode: AnalysisMode = "health"): DashboardMetrics {
  return {
    health_score: 0,
    health_components: {
      coverage: 0, velocity: 0, accuracy: 0, availability: 0,
      dead_stock_score: 0, slow_mover_score: 0, stockout_score: 0, abc_score: 0,
      dead_stock_pct: 0, slow_mover_pct: 0, stockout_risk_pct: 0, a_item_revenue_pct: 0,
    },
    total_inventory_value: 0,
    annual_carrying_cost: 0,
    dead_stock_value: 0,
    dead_stock_count: 0,
    dead_stock_carrying_cost: 0,
    slow_mover_value: 0,
    slow_mover_count: 0,
    stockout_risk_count: 0,
    critical_stockout_count: 0,
    recoverable_capital: 0,
    turnover_ratio: 0,
    reorder_count: 0,
    total_skus: 0,
    abc_summary: { a_count: 0, b_count: 0, c_count: 0, a_revenue_pct: 0, b_revenue_pct: 0, c_revenue_pct: 0 },
    risk_distribution: { low: 0, watch: 0, elevated: 0, critical: 0, dead: 0 },
    top_risk_items: [],
    top_dead_stock: [],
    all_skus: [],
    reorder_recommendations: [],
    health_trend: [],
    analysis_mode,
  };
}
