# Browser feature verification checklist

Requested: 2026-10-15. Coordinator owns this verification slice (V02/F06/C02).

Latest checkpoint: 2026-10-15, first browser run complete: **34 passed, 17 failed, 51 total (16.8 minutes)**. **6 of 29 checklist items complete; 23 not yet complete.** These are task counts, not a percentage of product correctness. No complete feature-coverage claim is made while failures remain. The user chose to continue with the captured snapshot while other sessions keep editing the workspace.

| Status | Current evidence |
| --- | --- |
| Complete | Source snapshot, three isolated databases, both migrations on each, test HR provisioning, three additional test journeys, focused test-file lint |
| Under investigation | Compilation succeeded, but build TypeScript validation failed: five unsupported component-test query options and one missing component imported by a captured test |
| Browser baseline complete | 34/51 passed; 17 failed; one Chromium worker, development mode; production verification remains failed |
| Follow-up | Failure diagnosis and the user-requested 25-row employee-table scrolling/accessibility slice; snapshot unit gates wait for the integration session's build to avoid concurrent heavy jobs |
| Pending | Browser execution, unit/database suites, full typecheck/lint, production smoke, failure investigation and final evidence |
| Resource constraint | About 479 MiB of physical RAM free at the latest check; other sessions are active and have not been stopped |

Target: fixed source snapshot based on `bf807e8261f27a85c56564f46807f0fe946c45b3` plus captured working-tree changes and the three new feature-coverage journeys. Chromium, synthetic records, separate disposable PostgreSQL browser/integration/seed databases. Because production typechecking failed on unfinished captured tests, browser execution uses development mode. Production build/security/startup evidence remains separate and cannot be inferred from these development-mode results. A feature is checked only after its relevant tests pass.

- [x] Review PROJECT_SPEC.md, requirements, task acceptance, and existing tests.
- [x] Capture source hashes without copying environment files.
- [x] Create isolated browser, integration, and seed databases.
- [x] Apply both migrations and provision the test HR account.
- [x] Add real browser coverage for form edits, complete export, and exact reporting (execution pending).
- [x] Run focused ESLint on `tests/e2e/feature-coverage-live.spec.ts` (passed).
- [ ] Build the production app. **Failed TypeScript validation:** optimized compilation succeeded; five `exact` options in `employee-directory.test.tsx` are unsupported by Testing Library, and `data-readiness.test.tsx` imports a component absent from the snapshot. No validation has been disabled. All three migrations and HR provisioning passed. The snapshot uses the documented `turbopackAdditionalRoots` setting for its dependency junction; workspace configuration is unchanged.
- [ ] FR-11: Public homepage, section navigation, and login/register links.
- [ ] FR-01/ER-03: Registration, login/logout, protected access, and invalid/duplicate recovery.
- [ ] FR-02: Employee create/edit/detail and persistence after reload.
- [ ] FR-02: Search, filters, sorting, pagination, and browser history.
- [ ] FR-02: Archive/restore and preserved employee/history data.
- [ ] FR-03: Exact salary changes, history, stale-edit conflicts, and first salary assignment.
- [ ] FR-04: CSV validation, aliases, preview, file replacement, confirmation, and failure recovery.
- [ ] FR-04: Import and retrieve all 10,000 salary-pending employees.
- [ ] FR-05: Export every filtered row across pagination, exact decimals, and formula protection.
- [ ] FR-06: Exact report totals/statistics, native-currency separation, and grouping.
- [ ] FR-07/FR-08: Salary bands, tenure, outlier eligibility, and exact-data tables.
- [ ] FR-09: Missing-FX handling and return to native-currency reports.
- [ ] FR-10: Mobile layouts, keyboard navigation, focus restoration, loading/error/retry states.
- [ ] ER-05: Browser security policy and unhandled browser exceptions.
- [ ] Run the complete unit/component suite.
- [ ] Run the complete isolated database suite.
- [ ] Run TypeScript and lint.
- [ ] Run production-start/readiness smoke.
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
- [ ] Pass focused component and browser checks; inspect desktop/mobile rendering.
- [ ] Record evidence and coordinate the final diff with the integration session.
