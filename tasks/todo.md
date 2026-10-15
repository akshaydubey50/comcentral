# ComCentral audit implementation checklist

Updated 2026-10-15. This extends the existing project checklist. The original backend tasks are preserved through the mapping in [plan.md](plan.md). Scope and audit dispositions are in [the delivery plan](../docs/implementation-plan.md); actual execution results are in [validation.md](../docs/validation.md).

Current checkpoint: **6 of 34 tasks verified complete** (C01, F01, V01, B01, B03, B05). The **28 open items** comprise **22 delivery tasks**, **2 conditional optimizations** (P02/P03), **3 future product decisions** (U01-U03), and **1 recurring evidence task** (C02). F02 mobile cards are implemented with focused checks; browser acceptance remains. B02 persistence checks are drafted. Open delivery tasks include deployment and scheduled-job evidence, not only missing feature code.

The user has authorized audit implementation and incremental commits. C01 represents completed planning; other boxes track acceptance work still to implement or verify, including checks of existing features. Recommended frontend/delivery improvements are selected for implementation. Conditional performance changes require measurements; future account/tenant decision tasks retain the approved scope boundary. Existing registration, employee, salary, CSV and analytics code is retained.

Owners: Frontend and Backend are separately assigned workers in this coordinated development session; the former independent backend session is no longer active. Coordinator owns contracts/configuration/docs/CI/integration and delivery. Do not overlap writers. For every implementation task, use isolated database/browser targets, keep secrets out of output and run the applicable required gates from the delivery plan. Estimated file counts are bounds: split any task that grows beyond them.

## C01: Align the audit and current plan

Owner: Coordinator. Category: Required; planning complete.
Dependencies: None.
Likely files: docs/implementation-plan.md; tasks/plan.md; tasks/todo.md.
Estimated scope: M: 3 documents.

- [x] Every audit area maps to a task, a retained behavior or an explicit future decision.
- [x] Registration/password status is current and all original unfinished backend tasks are preserved.
- [x] Document links and task IDs resolve; no application code or approved scope is changed.

Verification: Check Markdown targets and ID coverage; compare the old backend backlog with the preservation table.

## C02: Record useful AI and architecture decisions

Owner: Coordinator. Category: Required; recurring per delivered slice.
Dependencies: C01.
Likely files: docs/architecture.md; docs/ai-use.md; docs/validation.md.
Estimated scope: S: 2-3 documents per slice.

- [ ] Each material decision records its reason, rejected alternatives and affected contract.
- [ ] AI entries identify the task, corrections and executed evidence without reconstructing unrecorded prompts.
- [ ] Current results live in validation.md; agent rules contain durable conventions rather than duplicate status.

Verification: Review the first completed slice against its task brief, diff and recorded command output.

## F01: Resolve the salary-dialog full-suite timeout

Owner: Frontend. Category: Required fix.
Dependencies: None.
Likely files: src/components/employees/salary-change-dialog.test.tsx; salary-change-dialog.tsx; tests/setup.ts only if implicated.
Estimated scope: S/M: 1-3 files.

- [x] Reproduce and identify the cause of the full-suite timeout before changing behavior or timing policy.
- [x] Preserve drafts, the opening version, explicit stale-data reload and required fresh review.
- [x] Focused and full-unit checks pass without skipped assertions or an unexplained timeout increase.

Verification: Run the focused salary-dialog file, then npm test -- --maxWorkers=1 --no-file-parallelism; record timing and cause.

## V01: Verify current registration against the real backend

Owner: Coordinator with backend/frontend owners. Category: Required integration closure.
Dependencies: F01 for the combined checkpoint; isolated verification can run independently.
Likely files: tests/integration/registration.integration.test.ts; tests/e2e/registration-live.spec.ts; test helpers; docs/validation.md.
Estimated scope: M: 3-5 files.

- [x] A five-character password registers, establishes a session and works after logout/login on a disposable target.
- [x] Four-character, duplicate and invalid submissions preserve account/session invariants; existing rollback cases remain covered.
- [x] The built UI routes, password controls and session handoff work with the real API; fixture-only results are labelled separately.

Verification: Run isolated registration integration tests and the live Playwright registration journey under existing target guards.

## B01: Verify atomic CSV import

Owner: Backend. Category: Required accepted behavior.
Dependencies: Existing test-target guard.
Likely files: src/server/services/imports.ts; focused import integration tests; tests/integration/test-database.ts only if needed.
Estimated scope: M: 2-4 files.

- [x] A valid multi-batch import inserts every row once without overwriting existing employees.
- [x] Late-batch failure, duplicate insertion races and changed confirmation input produce no partial import.
- [x] File size, row count, field, date and currency-precision limits match the template and API contract.

Verification: Use isolated PostgreSQL fixtures and deterministic failure/race coordination; inspect final counts, not timing assumptions.

## B02: Verify employee and salary persistence invariants

Owner: Backend. Category: Required accepted behavior.
Dependencies: Existing test-target guard; F01 only for the combined UI checkpoint.
Likely files: src/server/services/employees.ts; focused employee integration tests; src/shared/validation.ts if a defect is demonstrated.
Estimated scope: M: 2-4 files.

- [ ] Metadata and salary stale writes are rejected; salary and immutable before/after history commit together with actor/reason.
- [ ] Archive/restore preserves history and archived records reject prohibited salary operations.
- [ ] Stable filtered pagination and complete filtered export preserve exact decimal strings and formula-safe cells.

Verification: Extend isolated employee/API tests; retain existing concurrent salary and history-immutability coverage.

## B03: Verify persisted FX integrity and failures

Owner: Backend. Category: Required hardening and accepted behavior.
Dependencies: Existing test-target guard.
Likely files: src/server/services/fx.ts; src/server/domain/fx.ts; focused FX unit/integration tests.
Estimated scope: M: 3-5 files.

- [x] Read-time canonical checksum verification rejects mismatched stored content while preserving supported deduplication behavior.
- [x] Refresh success/failure, immutable snapshots, missing/stale rates and provider errors persist the documented states without changing native salaries.
- [x] Manual/cron refresh remains protected and deterministic tests do not call a live provider.

Verification: Use fixed provider responses and isolated persisted fixtures, including malformed rates and a deliberately mismatched checksum.

## B04: Verify persisted reporting calculations

Owner: Backend. Category: Required accepted behavior.
Dependencies: Existing test-target guard.
Likely files: src/server/services/insights.ts; src/server/domain/analytics.ts only if needed; focused analytics integration tests.
Estimated scope: M: 2-4 files.

- [ ] Reports use all matching employees and maintain native-currency separation and active/archived filter semantics.
- [ ] Totals, percentiles, bands and tenure agree with known exact fixtures, including anniversaries and leap-day behavior.
- [ ] Outlier cohorts respect employment type, minimum size and zero-IQR policy with explicit non-flagging states.

Verification: Compare persisted service results with deterministic domain fixtures; avoid tests that only repeat implementation formulas.

## B05: Guard demo seeding and its transaction

Owner: Backend. Category: Required before any new seed run.
Dependencies: None for implementation; isolated target for execution.
Likely files: prisma/seed.ts; seed/target helper if needed; focused guard and integration tests.
Estimated scope: M: 3-5 files.

- [x] An explicit demo/test target acknowledgment is required; production mode and unrelated populated targets are refused.
- [x] Count/marker preconditions and inserts share a transaction and table locks, with rollback on failure. Later normal demo writes remain allowed.
- [x] The dedicated target has exactly 10,000 deterministic employees after safe first/repeat execution, without deleting unrelated records.

Verification: First run offline refusal cases, then isolated transaction/race and seed checks; print counts only.

Evidence: 10 guard tests and 4 dedicated PostgreSQL tests passed on 2026-10-14; see [seed safety](../docs/seed-safety.md).

## B06: Add correlated redacted operational logs

Owner: Backend; coordinator for response contract. Category: Recommended operational baseline.
Dependencies: Agree request-ID header/error handling before client changes.
Likely files: src/server/http.ts; proposed logging helper; focused logging/HTTP tests; API documentation.
Estimated scope: M: 3-5 files.

- [ ] Each request has a bounded validated or generated correlation ID visible in response headers and matching structured logs.
- [ ] Credentials, cookies, tokens, connection strings and employee/salary payloads are excluded from logs.
- [ ] Logging failure cannot replace the original response; error output remains sanitized.

Verification: Exercise successful/error requests and failed log transport; inspect structured keys and redaction with harmless fixtures.

## B07: Add readiness and production-start verification

Owner: Backend with coordinator. Category: Recommended operational baseline.
Dependencies: B06 for consistent diagnostics.
Likely files: proposed readiness route; server configuration helper; production-start smoke script; focused tests.
Estimated scope: M: 3-5 files.

- [ ] A bounded DB readiness check returns a minimal healthy/unavailable result without connection or schema details.
- [ ] Missing required runtime configuration produces an actionable sanitized startup/readiness failure.
- [ ] The built Next app starts, answers readiness and stops cleanly; adapt to Next hosting instead of copying an Express server lifecycle.

Verification: Run the built-app smoke against an isolated reachable and unreachable target; verify bounded failure and cleanup.

## S01: Verify session and request boundaries

Owner: Backend; coordinator for browser coverage. Category: Required security verification.
Dependencies: V01; existing isolated guards.
Likely files: focused auth integration tests; existing registration/auth helpers; auth/HTTP implementation only for proven defects.
Estimated scope: M: 2-5 files.

- [ ] Expired and revoked/logout sessions cannot read or mutate protected employee data; copied old cookies do not remain authorized.
- [ ] Missing/foreign origins, incorrect content types, oversized input and auth-rate limits produce the intended sanitized responses.
- [ ] No password policy, account access model or existing durable throttling is weakened.

Verification: Use controlled session-expiry fixtures rather than wall-clock sleeps; run protected read/write and logout checks on the isolated target.

## S02: Add and verify browser security policy

Owner: Coordinator with frontend/backend owners. Category: Recommended hardening before public delivery.
Dependencies: Production build baseline; B07 where readiness is included.
Likely files: next.config.ts; middleware/proxy only if required by installed Next guidance; browser checks; deployment docs.
Estimated scope: M: 3-5 files.

- [ ] A documented CSP strategy supports the installed Next/MUI rendering and approved resources without a blanket bypass.
- [ ] Login, registration, dashboard, dialogs and charts render and function under the policy.
- [ ] Preview HTTPS responses verify intended headers and cookie protections; local-only evidence is labelled accurately.

Verification: Read installed framework guidance during implementation; test built pages and inspect actual preview response headers/console.

## S03: Bound expensive authenticated requests

Owner: Backend with coordinator. Category: Recommended operational hardening.
Dependencies: B06; deployment execution model understood.
Likely files: HTTP/rate-limit helper; affected report/import/export boundary; focused tests; API docs.
Estimated scope: M: 3-5 files per bounded route-family slice.

- [ ] Document limits and retry behavior appropriate to the deployment; avoid relying solely on per-process counters across instances.
- [ ] Legitimate 10,000-row imports and normal report/export use remain possible under documented concurrency limits.
- [ ] Rejected work returns a consistent response and is stopped before avoidable expensive processing.

Verification: Exercise accepted, limited and recovered requests with deterministic counters/time; split additional route families before expanding beyond scope.

## F02: Add mobile employee cards

Owner: Frontend. Category: Recommended usability improvement.
Dependencies: Stable existing employee contract.
Likely files: src/components/employees/employee-directory.tsx; employee-table.tsx; proposed employee-card.tsx; focused/browser tests.
Estimated scope: M: 3-5 files.

- [ ] Small screens show readable employee cards with the same status, currency, detail and allowed actions as the desktop table.
- [ ] Filters, sort, pagination, archive/restore and empty/error states keep existing API/URL behavior.
- [ ] Keyboard operation and 44px touch targets work without page overflow at 360, 768 and 1280px.

Verification: Use focused behavior checks and built-browser viewports; exercise at least one real directory/detail workflow.

## F03: Visualize headcount groups

Owner: Frontend. Category: Recommended reporting improvement.
Dependencies: Stable insights contract; B04 before release acceptance.
Likely files: src/components/insights/summary-sections.tsx; insights-dashboard.tsx; proposed chart helper; focused tests.
Estimated scope: M: 3-4 files.

- [ ] Country/department/role headcount charts use the existing filtered response rather than a separate population.
- [ ] Labels, text summary and an accessible table communicate the same counts without hover/color dependence.
- [ ] Loading, empty, error and narrow-screen states preserve filter context.

Verification: Compare displayed counts/table with fixed contract fixtures and inspect keyboard/mobile rendering; coordinate any new dependency first.

## F04: Visualize pay statistics and distributions

Owner: Frontend. Category: Recommended reporting improvement.
Dependencies: F03 chart approach; B04 before release acceptance.
Likely files: src/components/insights/summary-sections.tsx; distribution-sections.tsx; chart helper; focused tests.
Estimated scope: M: 3-4 files.

- [ ] Pay summaries and band charts remain separated by currency, or clearly labelled with the selected dated approximate USD view.
- [ ] Tables/tooltips retain exact decimal values and definitions; chart coordinates do not become salary calculation inputs.
- [ ] Missing/stale FX, empty cohorts and filter changes never display fabricated totals or stale context.

Verification: Check exact values against fixtures, multi-currency/stale-FX states and built-browser layout.

## F05: Visualize tenure reporting

Owner: Frontend. Category: Recommended reporting improvement.
Dependencies: F03 chart approach; B04 before release acceptance.
Likely files: src/components/insights/distribution-sections.tsx; chart helper; focused tests.
Estimated scope: M: 2-3 files.

- [ ] Show headcount and pay by documented tenure bucket with a visible reporting date.
- [ ] Use backend-calculated buckets and native-currency groups; do not recalculate tenure approximately in the browser.
- [ ] Provide equivalent table/text content and readable empty/mobile states.

Verification: Use anniversary/leap-day response fixtures and inspect the built chart/table at mobile and desktop widths.

## F06: Verify complete accessible frontend journeys

Owner: Frontend with coordinator. Category: Required accessibility/recovery verification.
Dependencies: F02-F05 for newly selected UI; existing flows can be checked earlier.
Likely files: tests/e2e/frontend.spec.ts; relevant component tests; only components with demonstrated defects.
Estimated scope: S/M per defect; split fixes beyond 5 files.

- [ ] Navigation/drawers/dialogs manage keyboard focus and restoration; loading mutations cannot be dismissed into ambiguous state.
- [ ] Forms, imports, detail/history and outliers have labelled controls and usable loading/empty/error/conflict recovery.
- [ ] Built pages at 360, 768 and 1280px have no page overflow and retain accessible exact-data alternatives.

Verification: Run keyboard-only and viewport journeys; include pending save, stale salary, changed CSV file and failed network cases.

## F07: Improve search interaction if selected

Owner: Frontend. Category: Optional; implement after core UI.
Dependencies: F02; choose debounce versus explicit-submit behavior.
Likely files: src/components/employees/employee-filters.tsx; employee-directory.tsx; focused tests.
Estimated scope: M: 2-3 files.

- [ ] Chosen search behavior is documented and updates URL/filter state consistently, including clearing and back navigation.
- [ ] Earlier responses cannot replace newer results; searching resets pagination appropriately.
- [ ] Typing does not cause excessive requests or remove an accessible explicit action if it remains part of the interaction.

Verification: Use controlled timers and reversed response order; verify keyboard submit and browser history.

## F08: Simplify CSV frontend state ownership

Owner: Frontend. Category: Recommended focused refactor.
Dependencies: B01 contract stable; existing file-race checks retained.
Likely files: src/components/imports/csv-import-workflow.tsx; proposed import hook and result-table components; existing tests.
Estimated scope: M: 4-5 files.

- [ ] Extract file-reading/preview state and focused tables only where responsibilities become clearer.
- [ ] Selecting another file invalidates the prior preview; confirmation always submits the reviewed content/hash.
- [ ] Pending/error/retry behavior and existing accessibility remain unchanged.

Verification: Run existing CSV race/recovery tests and preview-confirm browser checks; avoid tests that mirror the new hook internals.

## F09: Add a public product introduction if selected

Owner: Frontend with coordinator. Category: Optional product presentation decision.
Dependencies: Decide route and copy; retain authenticated dashboard behavior.
Likely files: proposed src/app/welcome/page.tsx; small landing components; route/CTA tests.
Estimated scope: M: 3-5 files.

- [ ] An agreed public route explains actual capabilities with working login/register calls to action.
- [ ] Existing dashboard URLs, session redirects and deep links remain valid; moving / requires a separate explicit decision.
- [ ] No unsupported production/security claims, real employee data or fabricated customer statistics appear.

Verification: Verify public/signed-in navigation and mobile/keyboard layout against the actual app; update scope only if selected.

## P01: Measure the intended workload

Owner: Backend with coordinator. Category: Required accepted delivery evidence.
Dependencies: B05; B01/B02/B04 correctness; B06 diagnostics recommended.
Likely files: scripts/benchmark.mjs; benchmark helper if needed; docs/validation.md.
Estimated scope: M: 2-3 files.

- [ ] Use an explicitly isolated 10,000-employee target; record dataset, environment, commit, request mix and no employee payloads.
- [ ] Measure cold/warm and concurrent list/report/export behavior, percentile latency, memory and error rate; include relevant large-import duration.
- [ ] Record proposed acceptance budgets and rationale; activate P02/P03 only for demonstrated bottlenecks or resource risk.

Verification: Run bounded reproducible measurements on the designated demo target and report limitations; no invented SLA.

## P02: Bound CSV export memory if required

Owner: Backend. Category: Conditional optimization.
Dependencies: P01 establishes the need; B02 export invariants.
Likely files: src/server/services/employees.ts or focused export service; export route; focused integration tests.
Estimated scope: M: 3-5 files.

- [ ] Export memory stays bounded for the measured workload through batching/streaming while preserving filters and order.
- [ ] Rows are neither duplicated nor skipped under the documented export consistency policy; decimal/formula safety is unchanged.
- [ ] Pre-header and mid-stream failures have defined observable behavior without an apparently complete corrupt file.

Verification: Compare complete export content/order with baseline fixtures and measure memory/latency again under the same workload.

## P03: Optimize report queries if required

Owner: Backend. Category: Conditional optimization.
Dependencies: P01 identifies a report bottleneck; B04 provides correctness fixtures.
Likely files: src/server/services/insights.ts; focused query module if useful; related domain/integration tests.
Estimated scope: M: 3-5 files for one report family.

- [ ] Move only measured expensive work into SQL/indexed queries, with parameterized values and allowlisted identifiers.
- [ ] Totals, percentiles, rounding, currency, tenure and outlier semantics remain equivalent to the established domain rules.
- [ ] Repeat the same benchmark and record improvement and trade-offs; split further report families into separate slices.

Verification: Compare optimized outputs with deterministic/persisted oracle fixtures and run the original workload benchmark.

## V02: Verify a reproducible release candidate

Owner: Coordinator. Category: Required release gate.
Dependencies: Selected fixes/features/hardening complete; P01 and any activated optimizations.
Likely files: package.json/lockfile if necessary; .github/workflows/ci.yml; production smoke script; docs/validation.md.
Estimated scope: M: 3-5 files; verification mainly execution.

- [ ] A clean checkout installs from its lockfile and passes unit, typecheck, lint, build, isolated integration and real browser gates with discovered tests.
- [ ] The production artifact starts and serves the tested routes; CI uses isolated targets and sanitizes artifacts.
- [ ] Record the reviewed commit and gate results; investigate dependency findings and document intentional version holds without blind upgrades.

Verification: Use npm ci and existing required scripts plus built-app smoke; verify actual CI logs rather than script names alone.

## D01: Deploy and verify persistent application behavior

Owner: Coordinator with backend owner. Category: Required delivery.
Dependencies: V02; concrete hosting/database configuration available.
Likely files: docs/deployment.md; deployment configuration only as needed; docs/validation.md.
Estimated scope: M: 2-4 files plus controlled deployment.

- [ ] Use the reviewed artifact, separate preview/demo/test database targets, safe migrations and correct production origin/cookie settings.
- [ ] Real signup/login, employee/salary history, valid/invalid import, complete export and reports work on the deployed app.
- [ ] Persisted records survive refresh and redeployment; secrets and synthetic demo data are appropriately separated from customer production use.

Verification: Follow the existing runbook and record URL/commit/date plus HTTPS/API/persistence smoke results; verify current provider limits when executing.

## D02: Verify live FX and the daily schedule

Owner: Backend with coordinator. Category: Required delivery.
Dependencies: D01; B03; existing protected cron route.
Likely files: FX operational configuration; docs/deployment.md; docs/validation.md; source only for demonstrated defects.
Estimated scope: S/M: 2-4 files.

- [ ] A real provider refresh creates a dated, attributed snapshot without changing native employee salaries.
- [ ] The deployed scheduled route is authenticated; an actual scheduled invocation has recorded outcome/freshness evidence.
- [ ] Failure and stale-rate behavior remain explicit; a manual trigger alone is not reported as proof of the daily schedule.

Verification: Run one identified live-provider smoke, inspect the next scheduled invocation and verify native/converted report behavior.

## D03: Make service and FX failures observable

Owner: Coordinator with backend owner. Category: Recommended operational baseline.
Dependencies: D01/D02; B06/B07.
Likely files: docs/deployment.md; monitoring/alert configuration; minimal related helper if needed.
Estimated scope: M: 2-4 files.

- [ ] Define ownership and thresholds for readiness failures, elevated errors and overdue FX refresh.
- [ ] Provide a usable correlation path from a reported error to redacted operational logs.
- [ ] Verify alert delivery to the authorized destination and record retention/usage limits without exposing business data.

Verification: Use a controlled non-production failure and overdue-job scenario; record detection, notification and recovery evidence.

## D05: Demonstrate backup and recovery

Owner: Coordinator with backend owner. Category: Recommended operational baseline before real-data operation.
Dependencies: D01; dedicated restore target.
Likely files: docs/deployment.md; recovery record; helper only if needed.
Estimated scope: S/M: 2-3 files plus isolated restore.

- [ ] Document backup availability and chosen recovery time/data-loss expectations; verify actual provider/account capability.
- [ ] Restore into a separate isolated target and verify schema, employee counts and salary-history relationships.
- [ ] Demonstrate application rollback without destructive schema rollback; record measured recovery outcome and remaining limits.

Verification: Perform a controlled backup/restore exercise on demo data; never overwrite the running application database.

## D04: Prepare the final repository and demonstration

Owner: Coordinator with frontend/backend owners. Category: Required delivery.
Dependencies: D01/D02; document D03/D05 status; all selected release tasks closed.
Likely files: README.md; docs/demo-script.md; docs/validation.md; docs/ai-use.md; reviewed change set.
Estimated scope: M: 3-5 documents plus recorded demo.

- [ ] README setup/access instructions and feature status match the deployed reviewed commit; credentials remain private.
- [ ] A short video demonstrates registration, directory, salary history/conflict, CSV and reporting/FX with labelled synthetic data.
- [ ] Link architecture/decisions, AI-use record, CSV guide, performance results and known limits; preserve unrelated concurrent work when preparing commits.

Verification: Follow the README from a clean checkout and replay the video script against the deployed app; audit artifact links and claims.

## U01: Decide whether to add a Viewer role

Owner: Product decision then coordinator/backend/frontend. Category: Future scope; no implementation yet.
Dependencies: Explicit role/access requirements.
Likely files: requirements.md and architecture.md initially.
Estimated scope: S: decision first; implementation split later.

- [ ] Define who can grant HR/Viewer access without silently changing the current public-HR requirement.
- [ ] Specify allowed fields and operations across list/detail/export, filtering/sorting, outliers and aggregate inference.
- [ ] Approve privacy acceptance scenarios, including small groups/bands, before assigning API and UI implementation.

Verification: Review a concrete permission/response matrix; do not treat hidden UI controls as authorization.

## U02: Decide whether to support multiple organizations

Owner: Product decision then coordinator. Category: Future scope; no implementation yet.
Dependencies: Explicit organizational access requirements.
Likely files: requirements.md and architecture.md initially.
Estimated scope: S: decision first; migration plan later.

- [ ] Specify membership, ownership and registration/invitation behavior for the proposed product.
- [ ] Define tenant isolation for every business query, export, job and audit relation.
- [ ] Prepare a data-preserving migration and isolation-test plan before changing the current shared-workspace schema.

Verification: Review the tenant model, access scenarios and migration/rollback strategy with concrete examples.

## U03: Decide on recovery, MFA and permission administration

Owner: Product decision then coordinator/backend/frontend. Category: Future scope; no implementation yet.
Dependencies: Explicit account-management requirements.
Likely files: requirements.md and architecture.md initially.
Estimated scope: S: decision first; one flow per implementation task.

- [ ] Choose required flows, delivery provider and recovery rules without inventing an email-verification gate for current registration.
- [ ] Specify token expiry/replay, session invalidation, rate limits and account-recovery failure behavior.
- [ ] Break approved capabilities into independently verifiable user journeys before implementation.

Verification: Review each recovery/enrollment/administration journey and failure case against the installed auth system's supported interfaces.

## Checkpoints

- [x] M0: F01/V01 close current registration and unit-suite evidence; C01 is current.
- [ ] M1: B01-B05 meet the accepted data invariants; no application database was used for tests or seeding.
- [ ] M2: selected F02-F08 improvements pass desktop/mobile/keyboard journeys against stable contracts.
- [ ] M3: B06/B07 and selected S01-S03 controls have real built-app evidence.
- [ ] M4: P01 records the workload baseline and targets; activated P02/P03 preserve results and show measured improvement.
- [ ] M5: V02 and D01/D02/D04 close required delivery; D03/D05 operational status is explicit.
- [ ] C02 records decisions, corrections and evidence at each checkpoint; optional F09/U01-U03 stay separate until selected.

A checkpoint is closed by recorded evidence, not an AI assertion of completion. Routine work already authorized proceeds without an added approval gate; material scope choices remain explicit.
