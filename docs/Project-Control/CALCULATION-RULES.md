# Calculation Rules

## Authority

The current canonical calculation path is:

`raw rows -> inventory-parser/demo-data -> resolvePolicy -> inventory-analyzer -> session metrics -> dashboard/detail/validation/insights`

Do not introduce another calculation path without first reconciling it with `lib/inventory-analyzer.ts`.

## Active Policy Defaults

System defaults in `lib/policy.ts`:

- Slow-moving threshold: `180` days
- Dead-stock threshold: `365` days
- Critical coverage threshold: `30` days
- Safety stock: `15` days
- ABC A threshold: top `70%` of annual consumption value
- ABC B threshold: next `20%` of annual consumption value
- Health Score weights:
  - Dead Stock: `30%`
  - Slow Moving: `25%`
  - Stockout Risk: `45%`
  - ABC: remaining weight, default `0%`
- Dead-stock recovery rate: `40%`
- Slow-moving recovery rate: `70%`
- Target coverage for slow-moving excess: `6` months

Policy precedence is resolved by `resolvePolicy` in this order: system defaults form the base, saved user policy overrides the defaults, and valid file-provided policy overrides both where present. Field-level source metadata is retained. Field-level source metadata is retained.

## Inventory Value

For each SKU:

`Inventory Value = stock_qty * unit_cost`

Portfolio inventory value:

`Total Inventory Value = SUM(stock_qty * unit_cost)`

## Usage and Coverage

User-facing label:

`Monthly Usage`

Description:

`Units consumed, issued or sold during a typical 30-day period.`

Internal/source compatibility field:

`units_sold_30d`

Derived values:

- `daily_usage = monthly_usage / 30`
- `months_of_stock = stock_qty / monthly_usage` when monthly usage is greater than zero
- `days_of_supply = months_of_stock * 30`
- zero monthly usage produces infinite days of supply for coverage calculations

## Dead Stock

Movement-history path:

`Dead Stock = stock_qty > 0 AND days_since_last_movement >= active dead_stock_days`

Zero-usage fallback:

When movement history is unavailable, a SKU with stock on hand and zero monthly usage can be classified as dead stock by fallback.

Dead-stock value:

`Dead Stock Value = SUM(stock_qty * unit_cost for dead-stock SKUs)`

Annual carrying cost:

`Dead Stock Carrying Cost = Dead Stock Value * 25%`

## Slow-Moving

Slow-moving is usage-based and policy-reactive:

`Slow Moving = daily_usage > 0 AND days_of_supply > active slow_moving_days AND NOT dead_stock`

Slow-moving value:

`Slow-Moving Value = SUM(stock_qty * unit_cost for slow-moving SKUs)`

Slow-moving must not be calculated from movement-history ageing buckets.

## Reorder Point and Stockout Risk

Lead time is converted to days by the analyzer.

- `lead_time_days = round(lead_time_months * 30)`
- `safety_stock_units = daily_usage * active safety_stock_days`
- `reorder_point = round(daily_usage * lead_time_days + safety_stock_units)`

Reorder-at-risk count:

`Reorder Count = COUNT(stock_qty <= reorder_point AND daily_usage > 0 AND NOT dead_stock)`

Replenishment status:

- `STOCKED_OUT`: stock is zero and demand exists
- `CRITICAL`: demand exists and days of supply is below lead time days
- `WATCH`: stock is at or below reorder point
- `HEALTHY`: none of the above

Dashboard stockout risk count is driven by critical stockout-risk items, not ageing.

## ABC Classification

Annual consumption value:

`Annual Consumption Value = monthly_usage * 12 * unit_cost`

SKUs are sorted by annual consumption value descending. Cumulative contribution determines ABC class:

- A: within active A threshold, default top `70%`
- B: within active A plus B threshold, default next `20%`
- C: remainder

ABC is informational in the default Health Score because the default non-ABC weights sum to `100%`.

## Inventory Turnover

Approved turnover formula:

- `Annualised Consumption Cost = SUM(monthly_usage * 12 * unit_cost)`
- `Current Inventory Value = SUM(stock_qty * unit_cost)`
- `Estimated Inventory Turnover = Annualised Consumption Cost / Current Inventory Value`
- `Estimated Days of Inventory = 365 / Estimated Inventory Turnover`

Interpretation wording:

- Interpretation: Turnover is a snapshot estimate based on annualised consumption and current inventory value.
- Context: Compare turnover against company targets, historical trends and relevant industry context.
- Possible Drivers: Lower turnover may be associated with excess stock, slower demand, long replenishment cycles, strategic buffers or product-mix effects. Review supporting records before concluding the cause.
- Action: Improving turnover may reduce capital tied up in inventory, but the financial impact depends on demand, service requirements and the amount of inventory that can be safely reduced.

Assurance/status wording:

`Calculated from uploaded inventory data using disclosed annualisation and 365-day conventions. Item-level values and turnover estimates are shown for calculation transparency.`

Turnover should be treated as reconciled with assumptions, not as a no-assumptions direct figure.

## Recoverable Capital

For slow-moving SKUs:

- `target_stock = monthly_usage * active target_coverage_months`
- `slow_moving_excess_units = max(stock_qty - target_stock, 0)`
- `slow_moving_excess_value = slow_moving_excess_units * unit_cost`

Recovery estimates:

- `Estimated Dead-Stock Recovery = dead_stock_value * active dead_stock_recovery_rate`
- `Estimated Slow-Moving Recovery = SUM(slow_moving_excess_value) * active slow_moving_recovery_rate`
- `Estimated Recoverable Capital = Estimated Dead-Stock Recovery + Estimated Slow-Moving Recovery`

This is a policy-based estimate, not guaranteed cash recovery.

## Health Score

Component percentages:

- `dead_stock_pct = dead_stock_count / total_skus * 100`
- `slow_mover_pct = slow_mover_count / total_skus * 100`
- `stockout_risk_pct = stockout_risk_count / total_skus * 100`

Component scores:

- `dead_stock_score = max(0, round(100 - dead_stock_pct * 2))`
- `slow_mover_score = max(0, round(100 - slow_mover_pct * 2))`
- `stockout_score = max(0, round(100 - stockout_risk_pct * 2.5))`
- `abc_score = 100` when ABC has zero default weight

Weighted score:

`Health Score = round(dead_stock_score * dead_weight + slow_mover_score * slow_weight + stockout_score * stockout_weight + abc_score * abc_weight)`

Weights are normalized from active policy percentages. The default ABC weight is the remaining weight after Dead Stock, Slow Moving, and Stockout Risk.

## Ageing Analysis

Ageing source priority:

1. If valid `ageing_days` is supplied, use it directly.
2. If no direct ageing exists and `last_movement_date` is valid, derive ageing days from analysis date minus last movement date.
3. If both exist, use direct `ageing_days` and retain `last_movement_date` as supporting lineage.
4. If neither is usable, exclude the row from ageing metrics and show ageing as unavailable when no usable rows exist.

Invalid or future dates must be flagged for review, not silently treated as zero age.

Ageing buckets:

- `0-30 Days`
- `31-90 Days`
- `91-180 Days`
- `181-365 Days`
- `365+ Days`

Ageing Health Score is value-weighted across bucket scores. Average ageing days are value-weighted when cost data exists; otherwise the simple average is used.

## Demo Determinism

Demo Mode uses:

- Fixed analysis date: `2026-06-30T12:00:00.000Z`
- Deterministic 200-row raw dataset
- Canonical raw-row storage in `sessionStorage.supplysense_raw_items`
- Fresh metrics calculated from those exact rows

Same demo rows plus same active policy must produce the same KPIs every time.

