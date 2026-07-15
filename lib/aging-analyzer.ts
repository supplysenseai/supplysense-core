import type { InventoryItem } from "@/lib/inventory-parser";
import type { AgingMetrics, AgingBucket, AgingItem } from "@/lib/types";

// ---------------------------------------------------------------------------
// Bucket definitions — standard industry ageing tiers
// ---------------------------------------------------------------------------
const BUCKET_DEFS = [
  { label: "0–30 Days",   color: "#10b981", min: 0,   max: 30  },
  { label: "31–90 Days",  color: "#3b82f6", min: 31,  max: 90  },
  { label: "91–180 Days", color: "#f59e0b", min: 91,  max: 180 },
  { label: "181–365 Days",color: "#f97316", min: 181, max: 365 },
  { label: "365+ Days",   color: "#ef4444", min: 366, max: null },
] as const;

// Items with ageing >= this are considered for liquidation
const DEAD_THRESHOLD_DAYS = 181;
// Slow-moving: 91–180 days
const SLOW_MIN_DAYS = 91;
const SLOW_MAX_DAYS = 180;

// Score weights per bucket (for ageing health score, 0–100)
const BUCKET_SCORES = [100, 80, 40, 15, 0];
const MS_PER_DAY = 86_400_000;

function getBucketIndex(days: number): number {
  for (let i = 0; i < BUCKET_DEFS.length; i++) {
    const b = BUCKET_DEFS[i];
    if (days >= b.min && (b.max === null || days <= b.max)) return i;
  }
  return BUCKET_DEFS.length - 1;
}

export function analyzeAging(items: InventoryItem[], analysisDateMs = Date.now()): AgingMetrics {
  const now = analysisDateMs;
  let directCount = 0;
  let derivedCount = 0;
  let invalidMovementDateCount = 0;

  const agingItems = items.flatMap((item) => {
    if (item.ageing_days !== undefined && item.ageing_days >= 0) {
      directCount++;
      return [item];
    }

    if (!item.last_movement_date) return [];

    const parsed = new Date(item.last_movement_date);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() > now) {
      invalidMovementDateCount++;
      return [];
    }

    derivedCount++;
    return [{
      ...item,
      ageing_days: Math.floor((now - parsed.getTime()) / MS_PER_DAY),
    }];
  });

  if (agingItems.length === 0) {
    return emptyAgingMetrics();
  }

  const ageing_source =
    directCount > 0 && derivedCount > 0 ? "mixed" :
    directCount > 0 ? "direct" :
    "last_movement_date";

  const totalValue = agingItems.reduce(
    (sum, item) => sum + item.stock_qty * item.unit_cost,
    0
  );
  const totalCount = agingItems.length;

  // ── Build buckets ────────────────────────────────────────────────────────
  const buckets: AgingBucket[] = BUCKET_DEFS.map((def, idx) => {
    const matching = agingItems.filter((item) => {
      const d = item.ageing_days!;
      return d >= def.min && (def.max === null || d <= def.max);
    });
    const value = matching.reduce(
      (sum, item) => sum + item.stock_qty * item.unit_cost,
      0
    );
    return {
      label: def.label,
      color: def.color,
      min_days: def.min,
      max_days: def.max,
      score: BUCKET_SCORES[idx],
      count: matching.length,
      value,
      pct_count: totalCount > 0 ? Math.round((matching.length / totalCount) * 100) : 0,
      pct_value: totalValue > 0 ? Math.round((value / totalValue) * 100) : 0,
    };
  });

  // ── Dead stock & slow movers ──────────────────────────────────────────────
  const deadItems = agingItems.filter((i) => i.ageing_days! >= DEAD_THRESHOLD_DAYS);
  const slowItems = agingItems.filter(
    (i) => i.ageing_days! >= SLOW_MIN_DAYS && i.ageing_days! < DEAD_THRESHOLD_DAYS
  );

  const dead_stock_value = deadItems.reduce(
    (sum, i) => sum + i.stock_qty * i.unit_cost, 0
  );
  const slow_moving_value = slowItems.reduce(
    (sum, i) => sum + i.stock_qty * i.unit_cost, 0
  );

  // ── Liquidation opportunities — top items by value, age ≥ 91 days ────────
  const liquidationPool = agingItems
    .filter((i) => i.ageing_days! > SLOW_MAX_DAYS)
    .sort((a, b) => {
      // Primary: oldest first; secondary: highest value first
      const ageDiff = b.ageing_days! - a.ageing_days!;
      if (ageDiff !== 0) return ageDiff;
      return b.stock_qty * b.unit_cost - a.stock_qty * a.unit_cost;
    })
    .slice(0, 15);

  const liquidation_opportunities: AgingItem[] = liquidationPool.map((item) => ({
    item_code: item.item_code,
    item_name: item.item_name,
    category: item.category,
    supplier: item.supplier,
    stock_qty: item.stock_qty,
    unit_cost: item.unit_cost,
    ageing_days: item.ageing_days!,
    inventory_value: item.stock_qty * item.unit_cost,
    bucket_label: BUCKET_DEFS[getBucketIndex(item.ageing_days!)].label,
  }));

  // ── Ageing health score ───────────────────────────────────────────────────
  // Weighted average of bucket scores, weighted by inventory value
  let weightedScore = 0;
  let weightedTotal = 0;
  for (let i = 0; i < buckets.length; i++) {
    const bv = buckets[i].value;
    weightedScore += BUCKET_SCORES[i] * bv;
    weightedTotal += bv;
  }
  const ageing_health_score = weightedTotal > 0
    ? Math.min(100, Math.max(0, Math.round(weightedScore / weightedTotal)))
    : 100;

  // ── Average ageing days (weighted by value if cost data available) ────────
  const hasValue = agingItems.some((i) => i.unit_cost > 0);
  let avg_ageing_days_raw: number;
  let avg_ageing_days: number;
  if (hasValue) {
    const sumValueDays = agingItems.reduce(
      (sum, i) => sum + i.ageing_days! * i.stock_qty * i.unit_cost, 0
    );
    avg_ageing_days_raw = totalValue > 0 ? sumValueDays / totalValue : 0;
    avg_ageing_days = Math.round(avg_ageing_days_raw);
  } else {
    avg_ageing_days_raw = agingItems.reduce((sum, i) => sum + i.ageing_days!, 0) / agingItems.length;
    avg_ageing_days = Math.round(avg_ageing_days_raw);
  }

  return {
    has_ageing_data: true,
    ageing_source,
    invalid_movement_date_count: invalidMovementDateCount,
    total_items: totalCount,
    total_value: totalValue,
    buckets,
    dead_stock_count: deadItems.length,
    dead_stock_value,
    slow_moving_count: slowItems.length,
    slow_moving_value,
    blocked_capital: dead_stock_value + slow_moving_value,
    liquidation_opportunities,
    avg_ageing_days_raw,
    avg_ageing_days,
    ageing_health_score,
  };
}

export function emptyAgingMetrics(): AgingMetrics {
  return {
    has_ageing_data: false,
    ageing_source: "none",
    invalid_movement_date_count: 0,
    total_items: 0,
    total_value: 0,
    buckets: BUCKET_DEFS.map((def, idx) => ({
      label: def.label,
      color: def.color,
      min_days: def.min,
      max_days: def.max,
      score: BUCKET_SCORES[idx],
      count: 0,
      value: 0,
      pct_count: 0,
      pct_value: 0,
    })),
    dead_stock_count: 0,
    dead_stock_value: 0,
    slow_moving_count: 0,
    slow_moving_value: 0,
    blocked_capital: 0,
    liquidation_opportunities: [],
    avg_ageing_days_raw: 0,
    avg_ageing_days: 0,
    ageing_health_score: 0,
  };
}
