export interface InventoryRow {
  sku_id: string;
  product_name: string;
  category: string;
  units_on_hand: number;
  unit_cost: number;
  unit_price: number;
  units_sold_30d: number;
  units_sold_90d: number;
  last_sale_date: Date | null;
  lead_time_days: number;
  // optional
  units_sold_12m?: number;
  demand_std_dev?: number;
  reorder_point?: number;
  reorder_qty?: number;
  units_reserved?: number;
  warehouse_location?: string;
  supplier_name?: string;
  order_cost?: number;
  is_perishable?: boolean;
  expiry_date?: Date | null;
}

export type ABCClass = "A" | "B" | "C";
export type RiskScenario =
  | "CRITICAL"
  | "DEAD"
  | "SLOW"
  | "OVERSTOCK"
  | "WATCH"
  | "HEALTHY";

export interface AnalyzedSKU extends InventoryRow {
  inventory_value: number;
  annual_consumption_value?: number;
  stockout_risk_score: number;
  daily_velocity: number;
  days_stock_remaining: number;
  abc_class: ABCClass;
  scenario: RiskScenario;
  is_dead_stock: boolean;
  is_slow_mover: boolean;
  is_stockout_critical: boolean;
  velocity_ratio: number;
  reorder_qty_eoq: number;
  safety_stock: number;
  reorder_point_calc: number;
  days_since_last_sale: number;
  urgency: "immediate" | "this_week" | "this_month" | "planned" | null;
  replenishment_status?: "STOCKED_OUT" | "CRITICAL" | "WATCH" | "HEALTHY";
  dead_stock_method?: "movement_history" | "zero_usage_fallback";
  slow_moving_excess_value?: number;
}

export interface HealthComponents {
  // composite sub-scores 0-100 (higher = better)
  coverage: number;
  velocity: number;
  accuracy: number;
  availability: number;
  // Phase 3 — the 4 health factors (0-100, higher = better)
  dead_stock_score: number;    // penalised by dead stock %
  slow_mover_score: number;    // penalised by slow mover %
  stockout_score: number;      // penalised by stockout risk %
  abc_score: number;           // rewarded by A-item revenue concentration
  // raw percentages for display
  dead_stock_pct: number;
  slow_mover_pct: number;
  stockout_risk_pct: number;
  a_item_revenue_pct: number;
}

export interface RiskDistribution {
  low: number;
  watch: number;
  elevated: number;
  critical: number;
  dead: number;
}

export interface ABCSummary {
  a_count: number;
  b_count: number;
  c_count: number;
  a_revenue_pct: number;
  b_revenue_pct: number;
  c_revenue_pct: number;
}

export interface ReorderRecommendation {
  sku_id: string;
  product_name: string;
  supplier_name: string;
  eoq: number;
  rop: number;
  days_until_stockout: number;
  urgency: "immediate" | "this_week" | "this_month" | "planned";
  abc_class: ABCClass;
  unit_cost: number;
}

export interface DashboardMetrics {
  health_score: number;
  health_components: HealthComponents;
  total_inventory_value: number;
  annual_carrying_cost: number;
  dead_stock_value: number;
  dead_stock_count: number;
  dead_stock_carrying_cost: number;
  slow_mover_value: number;
  slow_mover_count: number;
  stockout_risk_count: number;
  critical_stockout_count: number;
  recoverable_capital: number;
  non_performing_inventory_value?: number;
  estimated_dead_stock_recovery?: number;
  estimated_slow_moving_recovery?: number;
  estimated_days_inventory?: number;
  annualised_consumption_cost?: number;
  stocked_out_count?: number;
  reorder_watch_count?: number;
  reorder_urgency_counts?: {
    immediate: number;
    this_week: number;
    this_month: number;
    planned: number;
  };
  turnover_ratio: number;
  reorder_count: number;
  total_skus: number;
  abc_summary: ABCSummary;
  risk_distribution: RiskDistribution;
  top_risk_items: AnalyzedSKU[];
  top_dead_stock: AnalyzedSKU[];
  all_skus: AnalyzedSKU[];        // full dataset — used by drill-through
  reorder_recommendations: ReorderRecommendation[];
  health_trend: Array<{ m: string; v: number }>;
  // Phase 7
  analysis_mode: AnalysisMode;
  aging_metrics?: AgingMetrics;
  // Phase 12
  active_policy?: import("@/lib/policy").ActivePolicy;
}

// ── Phase 7: Multi-Mode Analysis ──────────────────────────────────────────────
export type AnalysisMode = "health" | "aging" | "complete";

export interface AgingBucket {
  label: string;
  color: string;
  min_days: number;
  max_days: number | null; // null = no upper limit
  count: number;
  value: number;
  pct_count: number;
  pct_value: number;
}

export interface AgingItem {
  item_code: string;
  item_name: string;
  category: string;
  supplier: string;
  stock_qty: number;
  unit_cost: number;
  ageing_days: number;
  inventory_value: number;
  bucket_label: string;
}

export interface AgingMetrics {
  has_ageing_data: boolean;
  ageing_source?: "direct" | "last_movement_date" | "mixed" | "none";
  invalid_movement_date_count?: number;
  total_items: number;
  total_value: number;
  buckets: AgingBucket[];
  dead_stock_count: number;
  dead_stock_value: number;
  slow_moving_count: number;
  slow_moving_value: number;
  blocked_capital: number;
  liquidation_opportunities: AgingItem[];
  avg_ageing_days: number;
  ageing_health_score: number;
}
// ──────────────────────────────────────────────────────────────────────────────

export interface ValidationWarning {
  code: string;
  row?: number;
  message: string;
  severity: "warning" | "info";
}

export interface ValidationError {
  code: string;
  message: string;
}

export interface UploadResult {
  success: boolean;
  filename: string;
  rows_parsed: number;
  rows_valid: number;
  rows_flagged: number;
  warnings: ValidationWarning[];
  errors: ValidationError[];
  metrics?: DashboardMetrics;
  analyzed_skus?: AnalyzedSKU[];
}
