/**
 * Inventory Policy Engine — Phase 12
 *
 * Defines configurable thresholds used throughout the analyzer.
 * Priority: file-embedded settings > user localStorage preferences > system defaults.
 */

export interface InventoryPolicy {
  // Thresholds
  slow_moving_days: number;        // items with days-on-hand > this are slow movers (default 180)
  dead_stock_days: number;         // items with no movement for this many days = dead (default 365)
  critical_coverage_days: number;  // items with < this many days of stock = critical (default 30)
  safety_stock_days: number;       // safety buffer days for reorder point (default 15)
  // ABC classification
  abc_a_pct: number;               // cumulative % of value that defines A class (default 70)
  abc_b_pct: number;               // next % for B class; C = remainder (default 20)
  // Health score weights (should sum to 100)
  weight_dead_stock: number;       // weight for dead stock factor (default 30)
  weight_slow_moving: number;      // weight for slow moving factor (default 25)
  weight_stockout_risk: number;    // weight for stockout risk factor (default 45)
  // Financial assumptions
  dead_stock_recovery_rate: number; // estimated liquidation recovery rate (default 40%)
  slow_moving_recovery_rate: number;// estimated slow-moving excess recovery rate (default 70%)
  target_coverage_months: number;   // target coverage used to estimate slow-moving excess (default 6)
}

export type PolicySource = "file" | "user" | "system";

export interface ActivePolicy {
  policy: InventoryPolicy;
  source: PolicySource;  // dominant source (the most specific source with any field)
  field_sources: Partial<Record<keyof InventoryPolicy, PolicySource>>;  // per-field source
}

// ── System Defaults ───────────────────────────────────────────────────────────

export const SYSTEM_DEFAULTS: InventoryPolicy = {
  slow_moving_days: 180,
  dead_stock_days: 365,
  critical_coverage_days: 30,
  safety_stock_days: 15,
  abc_a_pct: 70,
  abc_b_pct: 20,
  weight_dead_stock: 30,
  weight_slow_moving: 25,
  weight_stockout_risk: 45,
  dead_stock_recovery_rate: 40,
  slow_moving_recovery_rate: 70,
  target_coverage_months: 6,
};

const POLICY_FIELDS = Object.keys(SYSTEM_DEFAULTS) as (keyof InventoryPolicy)[];

// ── Policy Resolution ─────────────────────────────────────────────────────────

/**
 * Resolves the active policy by merging sources in priority order:
 *   file > user > system
 *
 * For each field, the first non-null/undefined source wins.
 * Tracks which source each field came from.
 */
export function resolvePolicy(
  filePolicy?: Partial<InventoryPolicy>,
  userPolicy?: Partial<InventoryPolicy>
): ActivePolicy {
  const policy = { ...SYSTEM_DEFAULTS };
  const field_sources: Partial<Record<keyof InventoryPolicy, PolicySource>> = {};

  for (const field of POLICY_FIELDS) {
    if (filePolicy != null && filePolicy[field] != null) {
      policy[field] = filePolicy[field] as number;
      field_sources[field] = "file";
    } else if (userPolicy != null && userPolicy[field] != null) {
      policy[field] = userPolicy[field] as number;
      field_sources[field] = "user";
    } else {
      field_sources[field] = "system";
    }
  }

  // Dominant source: most specific one present for any field
  const sources = Object.values(field_sources) as PolicySource[];
  let source: PolicySource = "system";
  if (sources.includes("file")) source = "file";
  else if (sources.includes("user")) source = "user";

  return { policy, source, field_sources };
}

// ── User Policy Storage (localStorage) ───────────────────────────────────────

const STORAGE_KEY = "supplysense_policy";

/**
 * Loads user policy from localStorage.
 * Returns empty object if nothing stored or on SSR.
 */
export function loadUserPolicy(): Partial<InventoryPolicy> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<InventoryPolicy>;
    // Validate: only keep numeric fields that are valid policy keys
    const cleaned: Partial<InventoryPolicy> = {};
    for (const field of POLICY_FIELDS) {
      const val = parsed[field];
      if (typeof val === "number" && isFinite(val) && val >= 0) {
        (cleaned as Record<string, number>)[field] = val;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

/**
 * Saves user policy to localStorage.
 * Only persists fields that differ meaningfully; null/undefined fields are omitted.
 */
export function saveUserPolicy(policy: Partial<InventoryPolicy>): void {
  if (typeof window === "undefined") return;
  try {
    // Filter to valid numeric values only
    const cleaned: Partial<InventoryPolicy> = {};
    for (const field of POLICY_FIELDS) {
      const val = policy[field];
      if (typeof val === "number" && isFinite(val) && val >= 0) {
        (cleaned as Record<string, number>)[field] = val;
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
  } catch {
    // storage unavailable — ignore
  }
}

/**
 * Removes user policy from localStorage, reverting to system defaults.
 */
export function resetUserPolicy(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
