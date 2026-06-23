"use client";
/**
 * Explicit demo mode loader.
 * Called only when the user intentionally clicks "Start Demo Mode".
 * Writes data + a demo-mode flag to sessionStorage so the dashboard
 * knows this is a deliberate demo, not a silent fallback.
 */
import { getDemoData } from "@/lib/demo-data";

export const DEMO_MODE_KEY   = "supplysense_demo_mode";
export const METRICS_KEY     = "supplysense_metrics";
export const FILENAME_KEY    = "supplysense_filename";
export const ROWS_KEY        = "supplysense_rows";
export const FIELDS_KEY      = "supplysense_fields";

export function loadDemoIntoSession(): void {
  const { metrics } = getDemoData();
  try {
    sessionStorage.setItem(METRICS_KEY,   JSON.stringify(metrics));
    sessionStorage.setItem(FILENAME_KEY,  "Demo dataset — Acme Manufacturing");
    sessionStorage.setItem(ROWS_KEY,      String(metrics.total_skus));
    sessionStorage.setItem(DEMO_MODE_KEY, "true");
    // Demo has full health fields
    sessionStorage.setItem(FIELDS_KEY,    JSON.stringify(["item_code","item_name","stock_qty","monthly_usage","unit_cost","lead_time","category","supplier"]));
  } catch {
    // storage full — no-op; dashboard will still redirect gracefully
  }
}

export function clearSession(): void {
  try {
    [METRICS_KEY, FILENAME_KEY, ROWS_KEY, DEMO_MODE_KEY, FIELDS_KEY].forEach(k =>
      sessionStorage.removeItem(k)
    );
  } catch { /* ignore */ }
}

export function isDemoMode(): boolean {
  try { return sessionStorage.getItem(DEMO_MODE_KEY) === "true"; }
  catch { return false; }
}

export function hasSessionData(): boolean {
  try { return !!sessionStorage.getItem(METRICS_KEY); }
  catch { return false; }
}
