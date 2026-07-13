# Codex Handover

## Workspace

- Project root: `E:\SupplySense AI\supplysense-ai`
- Shell: PowerShell
- Branch: `main`
- Latest approved pushed commit: `2b6cd8e`
- Commit title: `Fix calculation consistency and deterministic demo mode`

## Current Task Discipline

Before changing code:

1. Read the current user request carefully.
2. Check whether Reports & Exports are excluded.
3. Check the working tree with `git status --short`.
4. Inspect relevant files before editing.
5. Use small patches only.
6. Do not revert unrelated uncommitted changes.
7. Do not commit or push without explicit instruction.

## Canonical Files

- Parser: `lib/inventory-parser.ts`
- Analyzer: `lib/inventory-analyzer.ts`
- Ageing: `lib/aging-analyzer.ts`
- Policy: `lib/policy.ts`
- Health display: `lib/health-score.ts`
- Demo data: `lib/demo-data.ts`
- Demo loader: `lib/demo-loader.ts`
- KPI definitions: `lib/kpi-definitions.ts`
- Validation: `lib/validation-engine.ts`
- Upload page: `app/upload/page.tsx`
- Dashboard page: `app/dashboard/page.tsx`
- Settings page: `app/settings/page.tsx`

## Storage Keys to Watch

- `supplysense_demo_mode`
- `supplysense_metrics`
- `supplysense_metrics_version`
- `supplysense_uploaded_filename`
- `supplysense_rows_analyzed`
- `supplysense_fields_detected`
- `supplysense_raw_items`
- `supplysense_file_policy`
- `supplysense_active_policy`
- `supplysense_demo_analysis_date`

## Validation Commands

Use:

```powershell
npm.cmd run build
```

Use browser verification for demo-loading issues whenever possible, because isolated analyzer tests can miss stale storage and route-specific behavior.

## Current Risk Boundaries

- `lib/html-report-generator.ts` can contain older formulas or wording and should not be used as the source of truth.
- `lib/analyzer.ts` appears legacy.
- `README.md` needs a separate public-release cleanup.
- Any change to demo generation must verify all 200 raw rows are stored and ageing inputs are valid.
- Any change to policy save must verify slow-moving, recoverable capital, health score, validation, explainability, drill-down, and insights update from recalculated metrics.

## Required Reporting Style for Future Fixes

Return concise engineering reports with:

1. Root cause.
2. Exact files changed.
3. What was fixed.
4. Deterministic validation results where applicable.
5. Build result.
6. Remaining risks.

