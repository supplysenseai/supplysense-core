# Chat Handover

## Current Context

SupplySense is in Version 1.0 calculation validation and production readiness. The latest approved pushed commit is:

`2b6cd8e Fix calculation consistency and deterministic demo mode`

The approved Part 1 calculation-consistency work is complete, locally verified, committed, and pushed. Project-control documentation is currently being established. Do not restart the completed calculation audit unless explicitly asked.    

## Product Identity

- Company: SupplySense
- Platform: SupplySense Core
- Product: SupplySense Inventory Intelligence Suite
- Public branding: SupplySense
- App version: `1.0.0`

## Non-Negotiable Constraints

- Do not commit or push unless explicitly instructed.
- Do not modify Reports & Exports unless the task explicitly includes them.
- Do not add backend, database, real authentication, or dependencies for release cleanup.
- Do not change calculation formulas without explicit approval.
- Preserve demo, upload, dashboard, reports, insights, validation, preferences, and settings flows.
- Keep demo calculations deterministic.

## Current Calculation Commitments

- Turnover is `annualised consumption cost / current inventory value`.
- Turnover uses neutral interpretation wording and disclosed assumptions.
- Slow-moving is usage-based and controlled by active `slow_moving_days`.
- Ageing is movement-history-based and independent from slow-moving policy.
- Policy save recalculates active raw rows and replaces stale stored metrics.
- Demo uses fixed analysis date `2026-06-30T12:00:00.000Z`.

## Expected Demo Baseline at Default Policy

- Inventory value: `$325,401.64`
- Dead stock: `0` SKUs / `$0.00`
- Slow-moving: `103` SKUs / `$204,490.32`
- Stockout risk: `11`
- Reorder count: `17`
- Recoverable capital: `$105,180.94`
- Turnover: `2.74x`
- Health Score: `65`
- Average ageing days: `25`
- Ageing Health Score: `93`
- Ageing buckets: `185 / 0 / 0 / 15 / 0`
- ABC counts: `29 / 49 / 122`

## Best Next-Step Pattern

For any future calculation or browser discrepancy:

1. Trace the exact browser action path.
2. Inspect sessionStorage and localStorage keys.
3. Confirm raw rows, fields, active policy, metrics version, and analysis date.
4. Compare browser metrics to a direct analyzer run using the same raw rows and policy.
5. Patch the single canonical data flow, not display-only state.
6. Run `npm.cmd run build`.
7. Report root cause, files changed, validation values, build result, and remaining risks.

