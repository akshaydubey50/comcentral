# ComCentral task board

Updated 2026-10-15. This is the only active work checklist. Scope: [PROJECT_SPEC.md](../PROJECT_SPEC.md). Current execution and known failures: [validation.md](../docs/validation.md). [Original task acceptance/history](../docs/archive/2026-10-15-documentation-history.md#source-tasks-todo-md) preserves every original task ID and detailed criterion; this consolidation does not cancel pending work or promote old evidence into current acceptance.

## Progress and ownership

The original audit has **34 tasks: 21 recorded complete, 13 open**. Of the 13, seven are delivery tasks (V02, D01-D05, S02), one is ongoing evidence (C02), two are conditional optimizations (P02/P03), and three are future product decisions (U01-U03). **F10, F11 and F12 are three additional approved slices**, outside that denominator, all still in progress. These are task counts, not a product-completion percentage. Previously completed features require current regression verification after concurrent changes.

The integration session owns application fixes, dependency restoration, full release gates and final publication. The deployment session owns hosted work. This documentation slice owns C02 and the repository-documentation part of D04. Frontend/backend/coordinator file ownership follows [AGENTS.md](../AGENTS.md); one writer per file, coordinated contracts, no nested delegation or broad staging in the dirty tree. The deployment owner's active checklist and the separate not-found task remain temporary owned handoffs; merge their outcomes into this board/validation when those sessions finish. Do not run competing installs/build/browser suites on the constrained host.

## Priority delivery acceptance

- [ ] **V02 - Current reproducible release candidate.** Stabilize dependencies/source, fix or resolve every current failure and run unit, benchmark-helper, isolated ordinary/seed database, typecheck, lint, default production build, startup and production-browser gates on one fixed revision. Record passing CI for that revision and explicit dependency risks. `cadc103` CI failed its browser step (41/58); historical green snapshots do not close this task.
- [ ] **V02/F02/F06 - Current browser regression matrix.** Registration/login/logout/invalid recovery; employee create/view/edit/archive/restore and reload; every filter singly/combined, Apply/Enter/Clear/Back/Forward, sorting and First/Previous/Next/Last; 25-row scrolling, sticky headers, keyboard/mobile focus and stale-page recovery; first/change salary/history/conflict; CSV preview/replacement/rollback/10k persistence; filtered export, report math/currencies/tenure/outliers/FX errors and production CSP. Distinguish real persistence from intercepted recovery. Rerun corrected desktop page-size cases on a stable server; do not weaken rate limits/assertions/timeouts to obtain a pass.
- [ ] **D01 - Correct-account deploy and persistence.** Confirm user-owned Vercel/Neon scope, private runtime configuration, isolated preview/demo targets and reviewed migrations. Deploy the V02-qualified revision; exercise auth, employee, salary/history, CSV/export and reporting; verify refresh/redeployment persistence. The deployment owner reports replacement hosted smoke at `comcentral-six.vercel.app` (`cadc103`) and unchanged migration data, but full candidate/persistence acceptance remains open. Legacy `ankit85` hosting is not this acceptance.
- [ ] **S02 - Hosted browser security.** Inspect actual HTTPS headers/cookies/CSP and rendered account/workspace/dialog/chart flows. Local policy evidence does not close hosted acceptance.
- [ ] **D02 - Provider and daily schedule.** Verify a live dated snapshot without native salary changes, observe an actual authenticated scheduled invocation and stale/provider-failure recovery; cron configuration/manual refresh alone is insufficient.
- [ ] **D03 - Monitoring/notification.** Confirm authorized destination and ownership; connect request IDs/readiness/error/overdue-FX thresholds; demonstrate controlled detection, notification and recovery with provider/retention limits.
- [ ] **D05 - Backup/restore/rollback.** Verify actual account capability/objectives, restore synthetic data into a separate target, check schema/count/history relationships and measure restore/application rollback.
- [ ] **D04 - Repository/demo.** Replay portable clean-checkout setup for the selected revision, reconcile claims and links, then record/replay the concise synthetic-data demo with verified owned deployment and known limits. Documentation cleanup alone does not close video/hosting work.
- [ ] **C02 - Release evidence.** Keep decisions/rejected alternatives in architecture, AI contributions/corrections in ai-use, actual command/revision/environment outcomes in validation and work here. Close the release checkpoint only after its evidence is complete; continue this practice for later work.

## F10: Explain dashboard data readiness and open matching employees

Design direction and boundaries: [architecture.md](../docs/architecture.md).

Owner: Coordinator integrating frontend/backend. User approved development on 2026-10-15 after the interview-focused dashboard discussion. This is an additional dashboard slice, tracked separately from the original 34-task audit totals. Status: implementation written; verification in progress.

- [x] Define salaryStatus=PENDING|RECORDED; omission includes both, null identifies pending pay.
- [x] Implement full-population recorded/pending salary coverage, actual FX status and outlier cohort coverage.
- [x] Link matching, recorded and pending employees while preserving applied employee filters.
- [x] Retain salary status in directory/report filters, pagination, sorting and CSV export; Clear removes it.
- [x] Demonstrate failing tests for the missing filter and component before implementation.
- [x] Pass focused component/contract tests: 13/13, including empty/unavailable-USD states and partial-coverage rounding.
- [x] Verify persisted list/report/export populations: all 74 integration cases passed, including four readiness cases and the 15-case directory filter matrix, on separate disposable local databases.
- [ ] Verify keyboard/mobile layout and dashboard-to-directory behavior in a browser.
- [ ] Pass the full npm test suite. The first combined run was stopped after timing failures and a stale help-text assertion; no full-pass claim.
- [x] Pass npm run typecheck after correcting five unsupported Testing Library options.
- [x] Pass npm run lint.
- [ ] Pass npm run build.
- [x] Record the design direction, shared contract, architecture decisions and AI contributions.
- [x] Complete independent code review; correct coverage rounding and shared filter help.
- [ ] Record final execution results and commit the reviewed project changes.
- [ ] Push all reviewed project code to the existing GitHub branch, as explicitly requested by the user.

Later candidates: richer metric drill-down, chart presentation, a preview-only budget simulator and reproducible saved reports. They are not included in F10 completion.

## F11: Apply the approved dashboard design

User approved the combined [dashboard/pagination preview](../docs/design-previews/dashboard-pagination.html) on 2026-10-15. This presentation slice builds on F10 and retains the existing real reporting contract.

- [x] Create the HTML/CSS preview and inspect desktop/mobile layout and pagination behavior.
- [x] Obtain the user's layout preference: Use this overall direction.
- [x] Deliver the detailed interactive HTML reference (`docs/design-previews/dashboard-reference.html`; active owner handoff), desktop screenshot (`docs/design-previews/dashboard-reference-desktop.png`; active owner handoff), and mobile screenshot (`docs/design-previews/dashboard-reference-mobile.png`; active owner handoff); verify three screen widths, filters, state previews and pagination. See reference evidence (`docs/design-previews/dashboard-reference-validation.md`; active owner handoff).
- [ ] Integrate compact summaries and a currency-separated P25/P75/median group comparison.
- [ ] Arrange distribution and tenure panels side by side on wide screens and stack them on phones.
- [ ] Keep exact accessible tables, report filters, pending-salary exclusions and FX failure states.
- [ ] Pass focused checks, full type/lint/build and current browser journeys; record actual unit-suite status.
- [ ] Review and publish a separate incremental implementation commit.

F10/current employee workflows were published in `cf3da2b`; the approved preview and then-current verification evidence were pushed as `cadc103`. Remaining full-suite failures and the final build/browser work are explicitly pending, not a green release claim.

## F12: Branded 404 and unknown-route recovery

Implemented in `abf502b`: the root not-found boundary, scoped CSS and public read-only browser acceptance. This board owns the integrated F12 checklist outside the original 34-task total. See [actual execution evidence](../docs/validation.md#f12-branded-404-verification-2026-10-15); the temporary planning tracker has been consolidated here.

- [x] Inspect the existing boundary, design language and installed routing guidance.
- [x] Write a responsive static branded page with Home/Employees/Welcome links, without a fake /404 redirect, data query, new dependency or auth/API change.
- [x] Write top-level/nested real-404 status, URL preservation, recovery-link, keyboard and 320/768/1024/1440px browser cases.
- [ ] Pass the final shared-workspace unit/type/lint/build gate: the captured run was 301 passed/6 failed, type/build blocked by a concurrent dashboard import, and lint passed with one unrelated checker warning. F12's isolated committed-baseline production build, standalone TypeScript and lint all passed; this does not close the integrated release gate.
- [x] Pass all three production browser cases and inspect actual desktop/mobile rendering; real HTTP 404, existing recovery routes, Tab access, no CSP/unhandled errors and four responsive widths verified.
- [x] Review the scoped diff, record results and commit only the three verified source/test files as abf502b; preserve concurrent dashboard/dependency changes. Both owned app servers stopped; isolated source and captures retained as reproducible evidence.

## Conditional and future scope

- [ ] **P02 - Export memory:** activate only for measured workload/hosting risk; preserve complete ordered filtering, decimals, formula safety and observable mid-stream failure behavior, then repeat the same workload.
- [ ] **P03 - Reporting queries:** activate only for measured bottlenecks; preserve exact statistics, rounding, currencies, tenure and outliers with parameterized/allowlisted SQL and comparable before/after evidence.
- [ ] **U01 - Viewer role:** obtain a product decision on authority, permissions and inference/privacy safeguards.
- [ ] **U02 - Organizations:** decide membership/isolation and a data-preserving migration/test approach before multi-company use.
- [ ] **U03 - Account administration:** decide recovery/MFA/permission safeguards without silently gating approved immediate public registration.

## Original audit catalogue

Recorded complete means evidence exists for an earlier named slice, not deployed or current-regression acceptance. Exact commits, execution limits and the chronological results are in validation and the archived acceptance record.

| ID | Task | Status |
|---|---|---|
| C01 | Align the audit and current plan | Recorded complete |
| C02 | Record useful AI and architecture decisions | Ongoing release evidence |
| F01 | Resolve the salary-dialog full-suite timeout | Recorded complete |
| V01 | Verify current registration against the real backend | Recorded complete |
| B01 | Verify atomic CSV import | Recorded complete |
| B02 | Verify employee and salary persistence invariants | Recorded complete |
| B03 | Verify persisted FX integrity and failures | Recorded complete |
| B04 | Verify persisted reporting calculations | Recorded complete |
| B05 | Guard demo seeding and its transaction | Recorded complete |
| B06 | Add correlated redacted operational logs | Recorded complete |
| B07 | Add readiness and production-start verification | Recorded complete |
| S01 | Verify session and request boundaries | Recorded complete |
| S02 | Add and verify browser security policy | Local policy and hosted cookie/header smoke recorded; complete hosted CSP/flow acceptance open |
| S03 | Bound expensive authenticated requests | Recorded complete |
| F02 | Add mobile employee cards | Recorded complete |
| F03 | Visualize headcount groups | Recorded complete |
| F04 | Visualize pay statistics and distributions | Recorded complete |
| F05 | Visualize tenure reporting | Recorded complete |
| F06 | Verify complete accessible frontend journeys | Recorded complete |
| F07 | Improve search interaction if selected | Recorded complete |
| F08 | Simplify CSV frontend state ownership | Recorded complete |
| F09 | Add a public product introduction if selected | Recorded complete; refinement in final verification |
| P01 | Measure the intended workload | Recorded complete |
| P02 | Bound CSV export memory if required | Conditional; measurement trigger required |
| P03 | Optimize report queries if required | Conditional; measurement trigger required |
| V02 | Verify a reproducible release candidate | In progress |
| D01 | Deploy and verify persistent application behavior | Owned-account migration/deploy/smoke reported; qualified candidate, updated flows and redeploy-persistence acceptance open |
| D02 | Verify live FX and the daily schedule | Pending hosted execution/evidence |
| D03 | Make service and FX failures observable | Pending hosted execution/evidence |
| D05 | Demonstrate backup and recovery | Pending hosted execution/evidence |
| D04 | Prepare the final repository and demonstration | Pending hosted execution/evidence |
| U01 | Decide whether to add a Viewer role | Future scope; decision required |
| U02 | Decide whether to support multiple organizations | Future scope; decision required |
| U03 | Decide on recovery, MFA and permission administration | Future scope; decision required |

## Documentation cleanup slice - C02/D04

- [x] Review PayScope entry points and retain focused document responsibilities instead of copying its stack or claims.
- [x] Consolidate architecture, domain/API/CSV, operator, performance and reviewer guides; independently source-check important facts.
- [x] Add portable root setup and a maintained documentation index.
- [x] Preserve original acceptance, superseded choices, reference audit and execution history in one dated archive.
- [x] Compact AI contributions, current verification and the task board without losing failure/deployment boundaries.
- [x] Remove the merged guides/trackers and update remaining links; preserve the deployment owner's active handoff and its archived-readiness pointer.
- [x] Synchronize and visually verify the requirements PDF: one A4 page, 655 Markdown words, complete text/bounds checks and correct source-derived date.
- [x] Pass dependency-free link/parser checks and review the scoped diff.
- [x] Commit only owned documentation/guard changes; preserve the application's dirty files and leave push/deployment to their owner.
