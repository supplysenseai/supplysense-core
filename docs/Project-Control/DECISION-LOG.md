# Decision Log

| ID | Date | Decision | Rationale | Status |
|---|---|---|---|---|
| DEC-001 | 2026-07-13 | Brand the public product as SupplySense and SupplySense Inventory Intelligence Suite. | Removes competition-style "AI" positioning and supports commercial release. | Recorded |
| DEC-002 | 2026-07-13 | Do not show pricing, plans, trials, or paywalls inside Version 1.0. | Sales will occur through a third-party platform; local/demo users need full analytics access. | Recorded |
| DEC-003 | 2026-07-13 | Keep Version 1.0 client-side with no backend or database. | Reduces deployment risk and preserves spreadsheet-only workflow. | Recorded |
| DEC-004 | 2026-07-13 | Use `lib/inventory-analyzer.ts` as the canonical inventory calculation engine. | Prevents duplicate or conflicting calculation paths. | Recorded |
| DEC-005 | 2026-07-13 | Treat `lib/analyzer.ts` as legacy unless proven active. | Its formulas differ from the current approved analyzer. | Recorded |
| DEC-006 | 2026-07-13 | Do not modify Reports & Exports during Part 1 calculation cleanup unless explicitly approved. | Report output may have separate legacy assumptions and release risk. | Recorded |
| DEC-007 | 2026-07-13 | Remove universal turnover Good/Warning/Critical bands. | Turnover requires company-specific targets, history, and industry context. | Recorded |
| DEC-008 | 2026-07-13 | Define turnover as annualised consumption cost divided by current inventory value. | This is the approved transparent snapshot estimate. | Recorded |
| DEC-009 | 2026-07-13 | Classify turnover assurance as reconciled with assumptions. | Turnover uses annualisation, 365-day convention, and a current-value denominator. | Recorded |
| DEC-010 | 2026-07-13 | Keep `units_sold_30d` as an internal/source field but label it as Monthly Usage in user-facing surfaces. | Preserves parser compatibility while improving clarity. | Recorded |
| DEC-011 | 2026-07-13 | Derive ageing from `last_movement_date` when valid `ageing_days` is not supplied. | Demo and uploaded movement-history rows should not appear as missing ageing data. | Recorded |
| DEC-012 | 2026-07-13 | Use direct `ageing_days` when both direct days and `last_movement_date` are present. | Direct provided ageing is more explicit; date remains supporting lineage. | Recorded |
| DEC-013 | 2026-07-13 | Invalid or future movement dates require review rather than silent zero-age treatment. | Avoids hiding data quality defects. | Recorded |
| DEC-014 | 2026-07-13 | Policy save must recalculate active raw rows and replace stored metrics. | Policy changes must update dashboard, validation, insights, and drill-down outputs immediately. | Recorded |
| DEC-015 | 2026-07-13 | Slow-moving and movement-history ageing must remain independent calculations. | The slow-moving threshold must not alter ageing buckets or ageing health. | Recorded |
| DEC-016 | 2026-07-13 | Demo Mode must be deterministic with a fixed analysis date. | Repeatable QA requires same demo dataset plus same policy to produce identical KPIs. | Recorded |
| DEC-017 | 2026-07-13 | Demo start must clear stale demo metrics before writing canonical raw rows and recalculated metrics. | Prevents browser state from overriding deterministic generation. | Recorded |
| DEC-018 | 2026-07-13 | ABC classification uses annual consumption value, calculated as monthly usage × 12 × unit cost, not revenue. | ABC should reflect inventory consumption value and must not depend on sales price or revenue. | Recorded |
| DEC-019 | 2026-07-13 | Slow Moving is usage-based and controlled by the active `slow_moving_days` policy. | The classification must respond to inventory coverage and the user’s active policy rather than a fixed six-month label. | Recorded |
| DEC-020 | 2026-07-13 | Dead-stock items are excluded from Slow Moving. | Prevents the same inventory from being double-counted across Dead Stock and Slow-Moving populations. | Recorded |
| DEC-021 | 2026-07-13 | Inventory Health Score uses active `InventoryPolicy` weights. | The displayed score, component contributions, validation, and explainability must use one shared policy-driven calculation. | Recorded |
| DEC-022 | 2026-07-13 | ABC is informational and has zero Health Score weight under the current default policy. | The approved default weights are fully allocated to Dead Stock, Slow Moving, and Stockout Risk. | Recorded |
| DEC-023 | 2026-07-13 | Missing usable ageing data must display Not Available, Insufficient Data, or Review Required rather than 100 or Healthy. | Missing movement history is a data-availability condition, not evidence of perfect ageing health. | Recorded |
| DEC-024 | 2026-07-13 | Estimated Recoverable Capital is a policy-based estimate and must not be presented as guaranteed recovery. | Actual recovery depends on inventory condition, demand, disposition method, recovery rates, and target-coverage assumptions. | Recorded |
| DEC-025 | 2026-07-13 | Demo Mode must store the exact raw inventory rows used by the analyzer. | Policy changes require the original rows so active metrics can be recalculated without regenerating or changing the dataset. | Recorded |
| DEC-026 | 2026-07-13 | Demo Mode uses the fixed analysis date `2026-06-30T12:00:00.000Z`, while real uploaded data continues to use the appropriate live analysis date. | Demo results must remain repeatable without changing the date behaviour of real customer data. | Recorded |
| DEC-027 | 2026-07-13 | Calculation assumptions, annualisation conventions, policy thresholds, and estimate limitations must be disclosed in user-facing explainability. | Users must be able to understand how a KPI was calculated and distinguish calculated facts from policy-based estimates. | Recorded |

