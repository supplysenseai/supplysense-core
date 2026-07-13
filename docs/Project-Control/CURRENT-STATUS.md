# Current Status

## Snapshot

- Date recorded: 2026-07-13
- Project: SupplySense Inventory Intelligence Suite
- Package version: `1.0.0`
- Branch: `main`
- Latest approved pushed commit: `2b6cd8e` - `Fix calculation consistency and deterministic demo mode`
- Phase: Version 1.0 calculation validation and production readiness
- Status: The calculation-consistency and deterministic Demo Mode milestone is approved, locally verified, committed, and pushed. Project-control documentation is now being established before the next development scope is approved.

## Current Approved State

- Branding is SupplySense / SupplySense Inventory Intelligence Suite.
- Pricing cards, plan gates, and paywall copy were removed for Version 1.0.
- Demo mode is intended to be deterministic and uses a fixed analysis date.
- Demo mode must replace stale demo session state before storing canonical raw rows and metrics.
- Policy changes must recalculate active demo or uploaded data from raw rows.
- Ageing and slow-moving are separate concepts:
  - Ageing uses `ageing_days` or `last_movement_date`.
  - Slow-moving uses usage, days of supply, dead-stock exclusion, and active `slow_moving_days`.
- ABC classification is informational in the default Health Score because default Health Score weights sum to 100 across Dead Stock, Slow Moving, and Stockout Risk.

## Current Demo Baseline

The approved deterministic demo baseline at the default 180-day slow-moving policy is expected to remain stable:

- Total inventory value: `$325,401.64`
- Dead-stock SKU count: `0`
- Dead-stock value: `$0.00`
- Slow-moving SKU count: `103`
- Slow-moving value: `$204,490.32`
- Stockout risk count: `11`
- Reorder count: `17`
- Estimated recoverable capital: `$105,180.94`
- Estimated inventory turnover: `2.74x`
- Overall Health Score: `65`
- Average ageing days: `25`
- Ageing Health Score: `93`
- Ageing buckets: `185 / 0 / 0 / 15 / 0`
- ABC item counts: `29 / 49 / 122`

## Known Working Principles

- Uploaded customer data should use an appropriate real analysis date.
- Demo data should use `DEMO_ANALYSIS_DATE` only.
- Session metrics must be replaced after demo start and policy save, not patched cosmetically.
- Raw rows in `sessionStorage.supplysense_raw_items` must be the rows used by the analyzer.

## Known Caution Areas

- `README.md` still contains some older commercial/report wording and should be reviewed before final public release.
- `lib/html-report-generator.ts` has report-specific formulas and older wording; Reports & Exports were intentionally excluded from recent Part 1 calculation tasks.
- `lib/analyzer.ts` appears legacy relative to `lib/inventory-analyzer.ts`.
- Browser verification should be used for demo loading because isolated analyzer tests can miss session or route-specific issues.

