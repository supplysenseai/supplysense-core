# SupplySense Project Master

## Project Identity

- Company: SupplySense
- Platform: SupplySense Core
- Product: SupplySense Inventory Intelligence Suite
- Version: 1.0.0 release-candidate foundation
- Current phase: Version 1.0 calculation validation and production readiness
- Repository path: `E:\SupplySense AI\supplysense-ai`
- Current branch: `main`
- Latest approved pushed commit: `2b6cd8e` - `Fix calculation consistency and deterministic demo mode`

## Product Purpose

SupplySense turns existing inventory spreadsheets into operational dashboards, explainable inventory KPIs, validation views, executive briefs, and exportable reports. Version 1.0 is intentionally client-side: no backend, database, server authentication, or external analytics service is required.

## Technology Stack

- Framework: Next.js 16.2.7 App Router
- Runtime UI: React 19.2.4
- Language: TypeScript 5
- Styling: Tailwind CSS v4
- Charts: Recharts 3.8.1
- Animation: Framer Motion 12
- Spreadsheet parsing: SheetJS `xlsx`
- Icons: Lucide React
- Toasts: Sonner
- Deployment target: Vercel

## Application Areas

- Landing page and demo entry: `app/page.tsx`
- Upload flow: `app/upload/page.tsx`, `components/upload/*`
- Dashboard shell: `app/dashboard/layout.tsx`, `components/dashboard/*`
- Main dashboard: `app/dashboard/page.tsx`
- KPI explainability: `app/dashboard/kpi/[key]/page.tsx`, `lib/kpi-definitions.ts`, `lib/validation-engine.ts`
- Health score: `app/dashboard/health-score/page.tsx`, `lib/health-score.ts`
- ABC analysis: `app/dashboard/abc-analysis/page.tsx`
- Risk and heatmap: `app/dashboard/risk/page.tsx`, `app/dashboard/risk-heatmap/page.tsx`
- Turnover: `app/dashboard/turnover/page.tsx`
- Financial impact: `app/dashboard/financial-impact/page.tsx`
- Insights: `app/dashboard/insights/page.tsx`, `lib/insights-generator.ts`
- Validation: `app/dashboard/validation/page.tsx`, `lib/validation-engine.ts`
- Preferences and policy settings: `app/dashboard/preferences/page.tsx`, `app/settings/page.tsx`, `lib/policy.ts`
- Reports and exports: `app/dashboard/reports/page.tsx`, `lib/html-report-generator.ts`
- Demo data and loader: `lib/demo-data.ts`, `lib/demo-loader.ts`

## Core Architecture

1. Data enters through demo mode or upload.
2. Uploaded spreadsheet rows are parsed and normalized by `lib/inventory-parser.ts`.
3. Demo mode uses deterministic raw rows from `lib/demo-data.ts`.
4. Active inventory policy is resolved by `lib/policy.ts` from system defaults, user settings, and file policy.
5. `lib/inventory-analyzer.ts` produces canonical `InventoryMetrics`.
6. Session storage holds raw rows, fields, active policy, metrics, and demo analysis date.
7. Dashboard, detail pages, validation, insights, and drill-down surfaces read the canonical metrics rather than recalculating independently.
8. Policy changes recalculate the active raw dataset and replace stale stored metrics.

## Calculation Ownership

The authoritative calculation engine is `lib/inventory-analyzer.ts`, with supporting modules:

- `lib/inventory-parser.ts` for field mapping, validation, and date normalization.
- `lib/aging-analyzer.ts` for movement-history ageing analysis.
- `lib/health-score.ts` for display decomposition of the health score.
- `lib/policy.ts` for defaults, saved policy, policy resolution, and provenance.
- `lib/validation-engine.ts` for explainability and validation views.
- `lib/kpi-definitions.ts` for user-facing KPI definitions.

Legacy or secondary calculation-like files must not be promoted without review. `lib/analyzer.ts` and `lib/html-report-generator.ts` contain older or report-specific logic and are not the current canonical analyzer.

## Release Boundaries

- Do not change formulas without explicit calculation approval.
- Do not modify Reports & Exports during calculation cleanup unless the task explicitly includes them.
- Do not add backend, database, real authentication, or external services for Version 1.0.
- Do not reintroduce pricing, plans, paywalls, or module locks in the public app.
- Do not use live dates for demo ageing calculations.
- Preserve deterministic demo behavior: same demo rows plus same policy must produce identical KPIs.

