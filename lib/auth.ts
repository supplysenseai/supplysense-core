export type Plan = "free" | "starter" | "growth" | "enterprise";

export interface AuthUser {
  email: string;
  name: string;
  plan: Plan;
  token: string;
}

const AUTH_KEY = "supplysense_auth";

export function getAuth(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.token && parsed?.email) return parsed as AuthUser;
    return null;
  } catch { return null; }
}

export function setAuth(user: AuthUser): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated(): boolean {
  return getAuth() !== null;
}

export interface PlanConfig {
  label: string;
  maxSKUs: number;
  uploadsPerMonth: number;
  lockedModules: string[];
}

export const PLAN_CONFIG: Record<Plan, PlanConfig> = {
  free: {
    label: "Free",
    maxSKUs: 500,
    uploadsPerMonth: 1,
    lockedModules: ["financial-impact", "turnover", "insights", "risk-heatmap"],
  },
  starter: {
    label: "Starter",
    maxSKUs: 5000,
    uploadsPerMonth: 5,
    lockedModules: [],
  },
  growth: {
    label: "Growth",
    maxSKUs: 50000,
    uploadsPerMonth: 999,
    lockedModules: [],
  },
  enterprise: {
    label: "Enterprise",
    maxSKUs: Infinity,
    uploadsPerMonth: Infinity,
    lockedModules: [],
  },
};

export function isModuleLocked(plan: Plan, moduleKey: string): boolean {
  return PLAN_CONFIG[plan].lockedModules.includes(moduleKey);
}
