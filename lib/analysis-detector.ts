import type { AnalysisMode } from "@/lib/types";

/**
 * Determines the analysis mode from the set of canonical field names
 * detected in the uploaded file.
 *
 * Mode A — health:   planning fields present (monthly_usage or lead_time)
 * Mode B — aging:    ageing fields present (ageing_days or last_movement_date)
 * Mode C — complete: both planning and ageing fields present
 */
export function detectAnalysisMode(detectedFields: string[]): AnalysisMode {
  const fields = new Set(detectedFields);
  const hasPlanning = fields.has("monthly_usage") || fields.has("lead_time");
  const hasAging = fields.has("ageing_days") || fields.has("last_movement_date");

  if (hasPlanning && hasAging) return "complete";
  if (hasAging) return "aging";
  return "health"; // default — covers quantity-only files with health score
}

export const MODE_LABELS: Record<AnalysisMode, string> = {
  health: "Inventory Health Analysis",
  aging: "Stock Ageing Analysis",
  complete: "Complete Inventory Intelligence",
};

export const MODE_DESCRIPTIONS: Record<AnalysisMode, string> = {
  health:   "Health score, ABC classification, stockout risk, reorder recommendations",
  aging:    "Ageing buckets, dead stock, blocked capital, liquidation opportunities",
  complete: "Full health analysis + ageing analysis + combined recommendations",
};
