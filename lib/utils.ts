import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDate(date: Date | null | string): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function getDaysUntilStockout(
  unitsOnHand: number,
  unitsSold30d: number
): number {
  if (unitsSold30d === 0) return Infinity;
  const dailyVelocity = unitsSold30d / 30;
  return Math.floor(unitsOnHand / dailyVelocity);
}

export function getHealthColor(score: number): string {
  if (score >= 80) return "#10b981"; // emerald  — Excellent
  if (score >= 60) return "#3b82f6"; // blue     — Good
  if (score >= 40) return "#f59e0b"; // amber    — Fair
  return "#ef4444";                  // red      — Poor
}

export function getHealthLabel(score: number): "Excellent" | "Good" | "Fair" | "Poor" {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Poor";
}

export function getRiskColor(score: number): string {
  if (score <= 25) return "#10b981";
  if (score <= 50) return "#3b82f6";
  if (score <= 75) return "#f59e0b";
  return "#ef4444";
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}
