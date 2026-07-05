"use client";
/**
 * Explicit demo mode loader.
 * Called only when the user intentionally clicks "Start Demo Mode".
 * Writes data + a demo-mode flag to sessionStorage so the dashboard
 * knows this is a deliberate demo, not a silent fallback.
 */
import { getDemoData } from "@/lib/demo-data";

export const DEMO_MODE_KEY = "supplysense_demo_mode";
export const METRICS_KEY = "supplysense_metrics";
export const METRICS_VERSION_KEY = "supplysense_metrics_version";
export const METRICS_VERSION = "4";
export const FILENAME_KEY = "supplysense_filename";
export const ROWS_KEY = "supplysense_rows";
export const FIELDS_KEY = "supplysense_fields";

const DEMO_FIELDS = ["item_code", "item_name", "stock_qty", "monthly_usage", "unit_cost", "lead_time", "category", "supplier"];

export function loadDemoIntoSession(): void {
  const { metrics } = getDemoData();
  const metricsJson = JSON.stringify(metrics);

  try {
    sessionStorage.setItem(METRICS_KEY, metricsJson);
    sessionStorage.setItem(METRICS_VERSION_KEY, METRICS_VERSION);
    sessionStorage.setItem(FILENAME_KEY, "Demo dataset — Acme Manufacturing");
    sessionStorage.setItem(ROWS_KEY, String(metrics.total_skus));
    sessionStorage.setItem(DEMO_MODE_KEY, "true");
    sessionStorage.setItem(FIELDS_KEY, JSON.stringify(DEMO_FIELDS));

    localStorage.setItem(METRICS_KEY, metricsJson);
    localStorage.setItem(METRICS_VERSION_KEY, METRICS_VERSION);
  } catch {
    // storage full — no-op; dashboard will still redirect gracefully
  }
}

export function clearSession(): void {
  try {
    [METRICS_KEY, METRICS_VERSION_KEY, FILENAME_KEY, ROWS_KEY, DEMO_MODE_KEY, FIELDS_KEY].forEach((key) =>
      sessionStorage.removeItem(key)
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
