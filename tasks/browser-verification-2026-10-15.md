# Browser feature verification checklist

Requested: 2026-10-15. Coordinator owns this verification slice (V02/F06/C02).

Current user priority: focus on actual application behavior; further test-only failure corrections are deferred. The directory's blank salary-status selection is being corrected so the default and cleared state visibly say **All salaries**. Existing failed checks remain recorded below.

Latest checkpoint: 2026-10-15, pushed revision `cadc103` verified by [GitHub run 38700400765](https://github.com/akshaydubey50/comcentral/actions/runs/38700400765): **41 browser tests passed, 17 failed, 58 total (1.7 minutes)**. Unit tests, benchmark checks, TypeScript, lint, database integration, production build and startup all passed on that revision. **13 of 29 checklist items complete; 16 not yet complete.** These are task counts, not a percentage of product correctness. Current follow-up edits require another run. The earlier captured-snapshot result remains below as historical evidence.

| Status | Current evidence |
| --- | --- |
| Complete | Source snapshot, three isolated databases, both migrations on each, test HR provisioning, three additional test journeys, focused test-file lint |
| Current published gates | `cadc103`: unit, benchmark, typecheck, lint, integration, build and production-start checks passed in GitHub CI |
| Current browser result | 41/58 passed; 17 failed; two Chromium workers against the production build, with CI's configured retry |
| Follow-up | Fix failing browser expectations and fixture isolation; rerun the 25-row scrolling checks after the corrected page-size locator |
| Pending | Resolve all browser failures, rerun the combined current revision, finish evidence and owned-resource cleanup |
| Historical snapshot | 34/51 passed in development mode; its production build failed on unfinished captured tests. That result is not the current published gate |

Current target: published `cadc103`, Chromium and disposable CI PostgreSQL databases. The original target was a fixed source snapshot based on `bf807e8261f27a85c56564f46807f0fe946c45b3` plus captured working-tree changes and the three new feature-coverage journeys. It used separate local browser/integration/seed databases and development mode after production typechecking failed. Results from those two targets are kept separate. A feature is checked only after its relevant tests pass.

- [x] Review PROJECT_SPEC.md, requirements, task acceptance, and existing tests.
- [x] Capture source hashes without copying environment files.
- [x] Create isolated browser, integration, and seed databases.
- [x] Apply both migrations and provision the test HR account.
- [x] Add real browser coverage for form edits, complete export, and exact reporting (CI: form/salary journey passed; export/report fixtures failed).
- [x] Run focused ESLint on `tests/e2e/feature-coverage-live.spec.ts` (passed).
- [x] Build the production app. Passed for `cadc103` in CI; the earlier captured snapshot failed TypeScript validation as recorded below.
- [x] FR-11: Public homepage, section navigation, and login/register links. All welcome/root cases passed in CI.
- [ ] FR-01/ER-03: Registration, login/logout, protected access, and invalid/duplicate recovery.
- [ ] FR-02: Employee create/edit/detail and persistence after reload.
- [ ] FR-02: Search, filters, sorting, pagination, and browser history.
- [ ] FR-02: Archive/restore and preserved employee/history data.
- [ ] FR-03: Exact salary changes, history, stale-edit conflicts, and first salary assignment.
- [ ] FR-04: CSV validation, aliases, preview, file replacement, confirmation, and failure recovery.
- [x] FR-04: Import and retrieve all 10,000 salary-pending employees. Passed in CI (18.1 seconds).
- [ ] FR-05: Export every filtered row across pagination, exact decimals, and formula protection.
- [ ] FR-06: Exact report totals/statistics, native-currency separation, and grouping.
- [ ] FR-07/FR-08: Salary bands, tenure, outlier eligibility, and exact-data tables.
- [ ] FR-09: Missing-FX handling and return to native-currency reports.
- [ ] FR-10: Mobile layouts, keyboard navigation, focus restoration, loading/error/retry states.
- [ ] ER-05: Browser security policy and unhandled browser exceptions.
- [x] Run the complete unit/component suite. Passed in CI for `cadc103`.
- [x] Run the complete isolated database suite. Passed in CI for `cadc103`.
- [x] Run TypeScript and lint. Both passed in CI for `cadc103`.
- [x] Run production-start/readiness smoke. Passed in CI for `cadc103`.
- [ ] Investigate failures, retain evidence, and distinguish app defects from test/setup issues.
- [ ] Review added tests and record passed, failed, and untested areas in docs/validation.md.
- [ ] Compare source hashes with the live workspace and state any snapshot limitations.
- [ ] Stop the owned temporary app and database container.

Separate evidence remains necessary for Firefox/WebKit, live FX-provider success, scheduled jobs, deployed HTTPS/persistence, and backup/recovery. Passing this checklist is bounded evidence, not proof that no bugs exist.

Setup history: interrupted the first webpack build after 672.8 seconds without a compiler error and a subsequent dependency installation after 1439.5 seconds. Only owned processes were stopped. Corrected the harness to wait for PostgreSQL's final TCP server, rather than its temporary initialization socket. The initial `3bac573` snapshot was refreshed because concurrent workspace changes affected employee/import behavior. These setup attempts are not application feature failures or passing feature evidence.

A subsequent Turbopack attempt failed because the snapshot's additional dependency root was too narrow (`node_modules`). The harness now uses its parent workspace as the documented additional root. The corrected attempt compiled successfully, then failed TypeScript validation after 282.9 seconds. Its diagnostics remain in `logs/build-linked-1.log` in the temporary verification directory. The missing component now exists in the live workspace, confirming that the captured tree included an unfinished concurrent change; the five query-option errors also remain in the live test file at the time of inspection.

The 51-case development-mode browser baseline returned 34 passes and 17 failures. Confirmed causes include cold navigation timeout, a connection reset while retrieving the successfully imported 10,000 records, signup fixtures exceeding the unchanged 5-per-15-minute limit, an outdated numeric-pagination locator, and a production-only CSP assertion run against development mode. Other failures remain under diagnosis. No retries or timeout increases were used in this baseline. The integration session reports it corrected the current-tree TypeScript issues; those changes are not part of this snapshot.

## Requested employee-table accessibility follow-up

User confirmed the Employee directory table, with 25 rows per page and scrolling.

- [x] Confirm existing default page size is 25 and preserve server pagination.
- [x] Add regression coverage for 25 rendered rows, keyboard access, fixed headers, next-page access and mobile cards.
- [x] Demonstrate the new regression fails before implementation (missing named region; 1 failed, 1 passed).
- [x] Add a bounded, labelled, keyboard-focusable scroll area and fixed column headers.
- [x] Pass both focused component cases (2/2 in the integration session's full unit run; published CI unit suite also passed).
- [ ] Pass all four responsive browser cases. Mobile 320/768px passed locally and in CI. Desktop 1024/1440px passed scrolling/header assertions before failing an overly exact page-size accessible-name locator; that locator is corrected locally, pending a stable rerun.
- [x] Inspect desktop screenshots at 1024/1440px: the fixed header, final rows, action column and pagination footer remain usable; the narrower table scrolls horizontally within its container.
- [x] Record evidence and coordinate the final diff with the integration session. Implementation published in `cf3da2b`; locator correction and latest evidence await the next commit.

The second local four-case browser run failed before rendering because the concurrently running development server displayed `Module not found: Can't resolve '@prisma/client/runtime/client'`. All four results are failures, not evidence against the scroll behavior or passing reruns. The integration session owns the next stable production-build run. First-run screenshots and both run traces remain under the temporary audit directory in `scroll-test-results` and `scroll-verified-results`.

CI failure categories at `cadc103`: three salary-status empty-label assertions, one removed pagination-text expectation, two page-size name assertions, one mobile control checked before scrolling, three ambiguous directory selectors, one report-heading expectation, and six authentication/import failures (including explicit HTTP 429 responses). These categories identify investigation work; they do not classify every failure as a test-only defect. The complete CI log is retained as `logs/github-38700400765-browser.log` in the temporary audit directory.
