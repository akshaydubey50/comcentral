# Employee pagination and filters: F02/B02/V02

User request: visible First, Previous, Next and Last buttons; verify that every employee filter works.

- [x] Trace browser state, API serialization, validation and database query boundaries.
- [x] Add navigation controls with correct boundaries, preserved filters and 44px targets.
- [x] Recover stale pages without claiming that matching employees do not exist.
- [x] Preserve selected dropdown values while choices are unavailable; keep Apply/Enter/Clear behavior.
- [x] Focused frontend regressions: final 27/27 passed, including retained numeric navigation; new control/recovery/blank-selection cases failed before implementation.
- [x] Full shared-tree unit/component suite: 280/280 across 36 files, 179.17 seconds.
- [x] Final isolated suite: 255/255 across 32 files, 144.31 seconds; standalone TypeScript and lint checks passed. Explicit verification-only Vitest paths resolved the linked setup path.
- [x] Isolated database matrix: 15/15 passed, 4.94 seconds; individual/combined filters, case-insensitive search, stable pagination and pending-pay records. Initial sandbox attempt hit Vitest realpath EPERM; approved execution outside the sandbox passed.
- [x] Isolated normal Turbopack production build passed, including TypeScript compilation. A temporary common dependency root was used solely for the same-drive verification checkout.
- [x] Built-app desktop/mobile journeys: 2/2 passed, 28.0 seconds; all six filters individually/combined, all four controls, page boundaries, browser history, reload, clear, mobile recovery and no overflow/unhandled browser errors.
- [x] Independent read-only review: no blockers; numeric controls, state preservation, fixture guards and scope checked.
- [x] Scoped implementation and evidence committed as 2140367 on fix/directory-pagination-20261015; owned test database and verification worktree removed, primary dependencies preserved.
- [ ] Final current-main unit/type/lint/build gates: 283 tests passed before three suites failed to collect with missing pg. Lockfile-based restoration succeeded and package loading/npm ls passed; retry passed 11 readiness tests before tinypool disappeared. Another npm ci (observed PID 24000) is actively replacing node_modules in this same checkout, so overlapping checks are stopped. Let that installation finish and coordinate a stable source/dependency snapshot before final gates.

Confirmed causes: missing First/Last controls; an out-of-range page rendered a false empty state; selected dropdown values rendered blank when their option was temporarily absent. Backend filters already combine consistently. Dropdown choices intentionally apply after Apply filters; Enter submits search. Filters are not cascading, so some combinations legitimately have no matches.

Verification uses labelled synthetic fixtures and an owned disposable local PostgreSQL database. No configured application records are changed. Preserve unrelated shared-checkout edits; current results verify this feature slice, not deployment or every other concurrent change.

The reviewed snapshot is commit 2140367. Main commit cf3da2b includes concurrent changes, including extracted responsive pagination and the shared browser-session helper; the earlier two browser journeys prove 2140367 and must not be represented as execution of that later redesign. Current-main verification is recorded separately.
