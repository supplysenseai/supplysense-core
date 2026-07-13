# Issue Register

| ID | Area | Issue | Status | Notes |
|---|---|---|---|---|
| ISS-001 | Branding | Old "SupplySense AI" wording appeared in user-facing app surfaces. | Resolved in prior Sprint 1 work | Keep searching new copy for old branding before release. |
| ISS-002 | Landing page | Pricing cards, free trial buttons, and sales plan sections appeared in the public app. | Resolved in prior release work | Pricing should remain outside the public app for Version 1.0. |
| ISS-003 | Paywalls | Plan gates and module-locked messages blocked analytics pages. | Resolved in prior release work | `PlanGate` should remain a pass-through wrapper for Version 1.0. |
| ISS-004 | Encoding | Mojibake characters appeared in UI/docs text. | Resolved in prior cleanup | Recheck before release if new copy is added. |
| ISS-005 | Export button | Main Dashboard Export button was not connected to the existing export/report route. | Resolved in prior work | Reports & Exports are now a protected scope for calculation cleanup tasks. |
| ISS-006 | Turnover | Old universal benchmarks and fixed Good/Warning/Critical turnover bands conflicted with approved formula. | Resolved in Part 1 | Turnover now uses neutral context and disclosed assumptions. |
| ISS-007 | Ageing data flow | Demo `last_movement_date` values were not fully flowing into ageing analysis. | Resolved in Part 1 | Ageing must accept valid direct ageing or movement-date-derived ageing. |
| ISS-008 | Policy reactivity | Saving slow-moving threshold persisted settings but did not consistently recalculate active metrics. | Resolved in Part 1 | Active raw rows must be recalculated and stale metrics replaced. |
| ISS-009 | Demo determinism | Demo data previously included runtime-randomized or date-sensitive values. || ISS-009 | Demo determinism | Demo data previously included runtime-randomized or date-sensitive values. | Resolved by commit `2b6cd8e` | Continue browser-path verification, not just isolated analyzer tests. | | Continue browser-path verification, not just isolated analyzer tests. |
| ISS-010 | Documentation | No dedicated project-control documentation existed before this task. | In progress | This folder establishes master facts and handover docs. |
| ISS-011 | README | README still contains some older wording, including benchmark/report language and a malformed table fragment. | Open | Review README separately before final public release. |

## Release Risk Notes

- Any future formula change should be tested through demo start, upload, policy save, dashboard refresh, validation, KPI explainability, insights, and drill-down.
- Browser storage can preserve stale metrics; release QA should test a fresh session and a dirty existing session.
- Reports & Exports may contain legacy assumptions and should be audited separately before being used as a calculation authority.

