# Verification evidence

Verified on 2026-10-14 with Node 24.18.1, Next.js 16.4.0, Prisma 7.10.0 and TypeScript 5.9.3.

These results identify separate working-tree checkpoints. F01 resolved the salary-dialog timeout with a 125-test full-suite pass. The 2026-10-15 combined follow-up had 143 passes and one AppShell session-recovery timeout; the current full-unit gate is not green. Current five-character registration has real PostgreSQL and built-browser evidence. Older results remain in the historical sections and must not be added to overlapping current runs. Nothing is deployed yet.

| Check | Current evidence |
|---|---|
| One-page requirements | 642 words after the approved audit usability/delivery additions; rendered one-page A4 PDF, text and page bounds checked against Markdown, and preview visually inspected |
| Public registration | Implemented and verified: real signup persists credentials, establishes a session, opens the shared workspace, and supports logout/login |
| Prisma generation/schema | Client generation and Prisma validate passed |
| Unit/component tests | Latest follow-up: 143 passed, 1 AppShell session-recovery timeout across 24 files in 244.25s; investigation pending. Earlier F01: 125/125 passed; salary-dialog tests also passed in the follow-up |
| TypeScript | `npm run typecheck` passed, including after restoring the pre-existing generated Next.js type imports changed by the build |
| Lint | Full ESLint check passed with no errors or warnings |
| Production build | Next.js optimized production build passed; all 17 static pages generated and API routes built, including /register |
| Database integration | Separate focused runs: 15 registration/salary tests, 4 seed tests, 5 import tests and 4 FX tests passed on disposable local PostgreSQL 17; combined current-suite run pending |
| Migration and HR provisioning | Initial migration repaired and applied; Prisma status is up to date, read-only schema diff is empty, and the provisioned HR user and credential account are verified |
| Browser journeys | Current registration checkpoint: 6 Chromium journeys passed in 17.3s against the built app on localhost:3106: 1 real five-character signup/logout/login case and 5 intercepted UI cases. Broader historical 15-journey run is recorded below; full current frontend run pending |
| 10,000-employee seed/performance | 10 target-guard cases and 4 dedicated PostgreSQL seed cases passed, including concurrent first/repeat runs with exactly 10,000 rows; workload measurement pending |
| Deployed software | Not deployed |
| Demo video | Script prepared; recording pending verified runtime |

## Commands and limitations

V01: the isolated registration/salary integration run passed 15/15 in 7.21s. The password-boundary case rejects four characters without account/cookie creation and accepts five characters through signup/logout/login. An isolated same-drive production snapshot passed build (17 static pages), full lint and TypeScript. Six registration Playwright journeys passed, including actual cookie persistence on the disposable database. Backend commit: `f6ff9be`; frontend/session-confirmation commit: `d29c4fd`; target guards: `8f7c96c`. A cross-drive Windows build snapshot initially failed resolving a junction path; a same-drive snapshot fixed that environment issue without application changes.

B05 (`8db8eed`): ten offline seed guards passed. Four dedicated PostgreSQL tests passed in 9.88s: concurrent/repeat exactly 10,000 rows, later-batch rollback, writer-first refusal and unrelated-marker preservation. B01 (`fa3a65e`): five import persistence cases passed in 3.00s: multi-batch success, late rollback, changed preview digest, deterministic duplicate race and JPY precision refusal. No production import change was necessary.

B03 (`f828883`): a persisted positive-rate snapshot with an incorrect checksum reproduced the defect (1 failed, 3 passed). After read-time checksum verification, all four FX persistence cases passed; seven FX domain and three refresh-authorization cases passed. They cover deduplication/fresh repeat validation, provider-failure persistence, stale/missing/cached states, immutable snapshots, manual session/origin protection and cron credentials. Provider calls were deterministic fixtures. TypeScript and targeted lint passed.

F01, 2026-10-14: instrumentation found approximately 1.9 seconds in MUI dialog rendering plus repeated document-wide accessibility queries and duplicate polling, leaving the stale-version scenario near the unchanged five-second unit limit. The test now scopes/caches controls and waits on visible workflow changes. A semantic labelled dialog test double removes the third-party portal/focus-trap/transition cost; production code and all salary-conflict assertions are unchanged. The focused file passed 5/5 (scenario 3.16s), then the full serial suite passed 125/125 in 130.13s. Full lint and TypeScript passed afterward. Actual dialog focus/keyboard behavior still belongs to the F06 browser journey. Earlier failures below are retained as historical debugging evidence.

## Earlier verification checkpoints

These dated records describe earlier snapshots. Pending work and limitations in this section are superseded by the current evidence above when a later result is recorded.

Frontend password follow-up, 2026-10-14: the approved 5-128 character policy is aligned in the form, HTTP validation and Better Auth configuration. Login, registration and confirmation now have independent, keyboard-accessible show/hide controls. The frontend session passed TypeScript and lint. An isolated production build generated all 17 pages, and all 5 registration browser journeys passed in Chrome against that build, with API calls intercepted. Those browser checks cover a five-character submission, visibility controls, duplicate recovery, missing-session recovery, existing-session redirects and mobile layout. A separate non-mutating browser check of the user's localhost:3000/register returned HTTP 200 with four inputs, no page errors and no horizontal mobile overflow. At that checkpoint the five-character policy had not yet been rerun in a live-database journey; V01 above now records that execution.

Before F01, the command was `npm test -- --maxWorkers=1 --no-file-parallelism --reporter=dot`: 124 passed and 1 timed out in 141.13s. The timeout is `SalaryChangeDialog > reloads a stale salary only after an explicit action and requires a fresh review`, at the unchanged five-second limit. A preceding full run had the same result. Between those runs, `npm test -- src/components/employees/salary-change-dialog.test.tsx --maxWorkers=1 --no-file-parallelism --reporter=verbose` passed all five cases in 15.69s without source or test changes. This shows execution-sensitive behavior but does not establish its root cause; investigate before treating the full unit gate as passed. All registration/password and eight browser-target guard tests passed in the latest run.

Historical successful runs contained 112 tests before the password follow-up and 117 afterward, before eight browser-target guard tests were added. These counts are not the current full-suite result. The recorded lint, TypeScript, production-build, integration and browser passes remain scoped to the snapshots described above.

The initial unit/lint attempts were terminated at 45 seconds and are not counted as passes. Backend focused tests passed 18/18. Full execution then found a DOM matcher registration problem, a CSV file-read readiness race, and React effect-based form resets. Fixes now preserve unsaved drafts and opening salary versions during background refetch, reset dialogs on reopen, and pass the selected CSV contents explicitly to mutations. Regression tests cover these behaviors.

The npm dependency installation is complete. The original frontend worker and its same-model replacement encountered Windows sandbox setup failures; the coordinator executed the tests and applied fixes after the replacement's analysis. No model escalation occurred.

The configured application database and provisioned HR login were left untouched during registration verification. A separate local PostgreSQL 17 container supplied the isolated test database; migrations and private test-user provisioning succeeded. The test app/container were stopped afterward. Full CSV transaction coverage, persisted analytics/FX checks, safe 10,000-row seeding/performance, live FX-provider validation, deployment and video remain pending. Vitest prints a non-failing deprecation notice for environmentMatchGlobs.

## Registration integration, 2026-10-14

Real database tests verify trimmed/lowercased identity values, unchanged password contents, cookie-based protected access, normalized and concurrent duplicate protection, input/origin/body limits, signup throttling, and session-free CLI provisioning. Temporary rejection constraints on the isolated account/session tables proved failed writes roll back the whole registration transaction. Both constraints were removed in finally blocks. Auth failures are logged without supplied credentials or raw database exceptions.

The test-target guard refuses the application database even if credentials, schema/query options, default ports, or supported pooler aliases differ. Browser writes additionally require a loopback app and matching local database URLs named *_test; live registration has an explicit opt-in. CI enables registration only against its disposable PostgreSQL service. The full live CI workflow at a new commit remains pending publication.

The historical browser login timeout was reproduced: the exact Password label matched zero controls, while the required-label selector matched one. The test now uses the required-label-compatible selector; the complete browser suite passes with original timeouts. The production build's changes to next-env.d.ts were restored to the saved pre-run contents before the final TypeScript check. Existing untracked files and frontend work were preserved; no registration changes were committed or pushed in this verification run.

## Initial migration recovery, 2026-10-14

The failed `202610140001_init` record had PostgreSQL syntax error `42601` and zero applied steps. Read-only catalog inspection found only `_prisma_migrations` and its primary-key index: no application tables, enums, functions, or triggers had been partially created. The migration's employee-code and FX-checksum regex literals were repaired, duplicated SQL was removed, and the displaced trimmed-text and complete-rates constraints were restored without weakening salary-history checks. An independent `gpt-5.6-sol` review and focused regression tests covered the repair.

Following the [Prisma 7 failed-migration recovery procedure](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/patching-and-hotfixing#failed-migration), a second preflight confirmed the same empty application schema before `prisma migrate resolve --rolled-back 202610140001_init`. Then `npm run db:migrate` and `npm run db:provision` both succeeded. The original failed record remains in migration history alongside the successful attempt; no tables or data were dropped, reset, or seeded.

Post-recovery read-only checks confirmed all restored check constraints and both immutable-audit triggers. `prisma migrate status` reports the schema is up to date; `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code` returned no differences. Exactly one matching HR user and credential account exist, and Better Auth's password verifier accepted the configured password against the stored hash. Credentials, password hashes and environment contents were never displayed. Provisioning output was captured and redacted before display.

At the migration-recovery checkpoint, `npm test`, `npm run lint`, `npm run build`, and `npm run typecheck` passed. This historical checkpoint is superseded for the current unit-suite status by the result at the top of this document. Pre-existing untracked files and concurrent frontend edits were preserved. That build's generated `next-env.d.ts` changes were restored to the saved pre-run contents and typechecked again.
