import type { DashboardMetrics } from "@/lib/types";

const METRICS_VERSION = "6";

let cachedMetricsJson: string | null = null;
let cachedMetrics: DashboardMetrics | null = null;

export function readStoredDashboardMetrics(options: { fallbackToLocalStorage?: boolean; validateVersion?: boolean } = {}) {
  if (typeof window === "undefined") return null;

  if (options.validateVersion) {
    const storedVersion = sessionStorage.getItem("supplysense_metrics_version");
    if (storedVersion !== METRICS_VERSION) {
      clearStoredDashboardMetrics();
      return null;
    }
  }

  const stored =
    sessionStorage.getItem("supplysense_metrics") ??
    (options.fallbackToLocalStorage ? localStorage.getItem("supplysense_metrics") : null);

  if (!stored) return null;
  if (stored === cachedMetricsJson && cachedMetrics) return cachedMetrics;

  const parsed = JSON.parse(stored) as DashboardMetrics;
  cachedMetricsJson = stored;
  cachedMetrics = parsed;
  return parsed;
}

export function clearStoredDashboardMetrics() {
  cachedMetricsJson = null;
  cachedMetrics = null;
  sessionStorage.removeItem("supplysense_metrics");
  sessionStorage.removeItem("supplysense_filename");
  sessionStorage.removeItem("supplysense_rows");
  sessionStorage.removeItem("supplysense_fields");
  sessionStorage.removeItem("supplysense_metrics_version");
}
