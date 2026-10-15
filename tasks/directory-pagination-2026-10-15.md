# Employee pagination and filters: F02/B02/V02

User request: visible First, Previous, Next and Last buttons; verify that every employee filter works.

- [x] Trace browser state, API serialization, validation and database query boundaries.
- [x] Add navigation controls with correct boundaries, preserved filters and 44px targets.
- [x] Recover stale pages without claiming that matching employees do not exist.
- [x] Preserve selected dropdown values while choices are unavailable; keep Apply/Enter/Clear behavior.
- [x] Focused frontend regressions: final 27/27 passed, including retained numeric navigation; new control/recovery/blank-selection cases failed before implementation.
- [x] Full shared-tree unit/component suite: 280/280 across 36 files, 179.17 seconds.
- [ ] Full TypeScript and lint checks.
- [x] Isolated database matrix: 15/15 passed, 4.94 seconds; individual/combined filters, case-insensitive search, stable pagination and pending-pay records. Initial sandbox attempt hit Vitest realpath EPERM; approved execution outside the sandbox passed.
- [x] Isolated normal Turbopack production build passed, including TypeScript compilation. A temporary common dependency root was used solely for the same-drive verification checkout.
- [x] Built-app desktop/mobile journeys: 2/2 passed, 28.0 seconds; all six filters individually/combined, all four controls, page boundaries, browser history, reload, clear, mobile recovery and no overflow/unhandled browser errors.
- [x] Independent read-only review: no blockers; numeric controls, state preservation, fixture guards and scope checked.
- [ ] Scoped incremental commit and temporary infrastructure cleanup.

Confirmed causes: missing First/Last controls; an out-of-range page rendered a false empty state; selected dropdown values rendered blank when their option was temporarily absent. Backend filters already combine consistently. Dropdown choices intentionally apply after Apply filters; Enter submits search. Filters are not cascading, so some combinations legitimately have no matches.

Verification uses labelled synthetic fixtures and an owned disposable local PostgreSQL database. No configured application records are changed. Preserve unrelated shared-checkout edits; current results verify this feature slice, not deployment or every other concurrent change.
