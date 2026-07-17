"use client";
/**
 * Explicit demo mode loader.
 * Called only when the user intentionally clicks "Start Demo Mode".
 * Writes data + a demo-mode flag to sessionStorage so the dashboard
 * knows this is a deliberate demo, not a silent fallback.
 */
import { DEMO_ANALYSIS_DATE, DEMO_FIELDS, getDemoInventoryItems } from "@/lib/demo-data";
import { analyzeInventoryItems } from "@/lib/inventory-analyzer";
import { resolvePolicy } from "@/lib/policy";

export const DEMO_MODE_KEY = "supplysense_demo_mode";
export const METRICS_KEY = "supplysense_metrics";
export const METRICS_VERSION_KEY = "supplysense_metrics_version";
export const METRICS_VERSION = "6";
export const FILENAME_KEY = "supplysense_filename";
export const ROWS_KEY = "supplysense_rows";
export const FIELDS_KEY = "supplysense_fields";
export const RAW_ITEMS_KEY = "supplysense_raw_items";
export const FILE_POLICY_KEY = "supplysense_file_policy";
export const ACTIVE_POLICY_KEY = "supplysense_policy";
export const DEMO_ANALYSIS_DATE_KEY = "supplysense_demo_analysis_date";

const SESSION_DEMO_KEYS = [
  METRICS_KEY,
  METRICS_VERSION_KEY,
  FILENAME_KEY,
  ROWS_KEY,
  DEMO_MODE_KEY,
  FIELDS_KEY,
  RAW_ITEMS_KEY,
  FILE_POLICY_KEY,
  ACTIVE_POLICY_KEY,
  DEMO_ANALYSIS_DATE_KEY,
];

export function loadDemoIntoSession(): void {
  const rawItems = getDemoInventoryItems();
  const activePolicy = resolvePolicy();
  const { metrics } = analyzeInventoryItems(rawItems, DEMO_FIELDS, activePolicy, { analysisDate: DEMO_ANALYSIS_DATE });
  const metricsJson = JSON.stringify(metrics);
  const rawItemsJson = JSON.stringify(rawItems);
  const fieldsJson = JSON.stringify(DEMO_FIELDS);
  const activePolicyJson = JSON.stringify(activePolicy);

  try {
    SESSION_DEMO_KEYS.forEach((key) => sessionStorage.removeItem(key));
    localStorage.removeItem(METRICS_KEY);
    localStorage.removeItem(METRICS_VERSION_KEY);

    sessionStorage.setItem(METRICS_KEY, metricsJson);
    sessionStorage.setItem(METRICS_VERSION_KEY, METRICS_VERSION);
    sessionStorage.setItem(FILENAME_KEY, "Demo dataset — Acme Manufacturing");
    sessionStorage.setItem(ROWS_KEY, String(metrics.total_skus));
    sessionStorage.setItem(DEMO_MODE_KEY, "true");
    sessionStorage.setItem(FIELDS_KEY, fieldsJson);
    sessionStorage.setItem(RAW_ITEMS_KEY, rawItemsJson);
    sessionStorage.setItem(FILE_POLICY_KEY, JSON.stringify({}));
    sessionStorage.setItem(ACTIVE_POLICY_KEY, activePolicyJson);
    sessionStorage.setItem(DEMO_ANALYSIS_DATE_KEY, DEMO_ANALYSIS_DATE);

    localStorage.setItem(METRICS_KEY, metricsJson);
    localStorage.setItem(METRICS_VERSION_KEY, METRICS_VERSION);
  } catch {
    // storage full — no-op; dashboard will still redirect gracefully
  }
}

export function clearSession(): void {
  try {
    SESSION_DEMO_KEYS.forEach((key) => sessionStorage.removeItem(key));
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
