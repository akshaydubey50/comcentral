# Validation and release evidence

## F12: Branded 404 verification, 2026-10-15

Scope: existing root not-found boundary, scoped CSS, public GET-only browser acceptance and the F12 tracker. Other sessions are editing dashboard charts in this shared checkout; their files are excluded from this slice. No API/schema/auth change or employee-data write.

| Command/check | Actual result |
|---|---|
| npm test -- --maxWorkers=1 --no-file-parallelism | 301 passed, 6 failed, 307 total across 40 files; 409.64 seconds. Failures are three stale TenureSection imports/render cases, two unfinished summary-state/disclosure cases, and a duplicate chart-table text locator in the concurrent dashboard files |
| npm run typecheck | Failed with one TS2305: distribution-sections.test.tsx imports TenureSection from its previous module; no 404 diagnostic |
| npm run lint | Passed with zero errors; one unrelated unused-variable warning in scripts/check-docs.mjs |
| npm run build | Optimized Turbopack compilation passed in 22.9 seconds, then TypeScript stopped on the same dashboard test import; no complete production-build claim |
| F12 browser acceptance and visual review | Pending execution |

The first local development-server attempt failed before routing when Windows sandbox permissions prevented SWC from canonicalizing the project path. The same check was retried with approved execution outside the sandbox. Browser verification uses a temporary loopback server with a deliberately unreachable local test database URL, random test-only auth secrets, and read-only page requests; it cannot read/write the configured application database. Development checks do not establish production CSP or deployed behavior. Follow [F12 on the task board](../tasks/todo.md#f12-branded-404-and-unknown-route-recovery); its active owner retains the temporary tracker until integration.

Updated 2026-10-15 during documentation consolidation. This is the only current execution ledger. A requirement, implemented component, historical passing snapshot, CI result and deployed observation are separate states. The [task board](../tasks/todo.md) owns remaining work; the [history archive](archive/2026-10-15-documentation-history.md#source-docs-validation-md) preserves original commands, counts, failures and environment limitations.

## Current release assessment

**The current integrated workspace is not release-qualified.** The latest inspected published CI result is `cadc103`; later local source and dependency changes require a stable rerun. Documentation cleanup has not rerun application checks and changes no production behavior. The deployment owner has separately reported owned-account hosted smoke below; those observations do not qualify the failed browser release gate. Completed scheduled-job observation, recovery rehearsal and demo video remain unproved.

| Target / task | Actual evidence | Remaining boundary |
|---|---|---|
| Published `cadc103`, V02/F06 | [GitHub run 38700400765](https://github.com/akshaydubey50/comcentral/actions/runs/38700400765): unit/component, benchmark helpers, TypeScript, lint, isolated integration, production build and startup passed. Chromium: **41 passed, 17 failed, 58 total**, 1.7 minutes | Workflow failed. Real form/edit/salary-history and 10,000-record import/retrieval passed; authentication/import failures include HTTP 429, with stale/ambiguous UI assertions also present. Do not classify every failure as test-only or close V02 |
| Later local current-main check | 283 tests passed before three suites failed collection with missing `pg`. Lockfile-based restoration briefly passed package loading; targeted readiness retry passed 11 cases before `tinypool` disappeared during another installation | Collection errors are not correctness passes. Dependency restoration and source stabilization belong to the integration session; do not overlap installs or checks |
| F10 readiness/filter slice | Red phase demonstrated missing salary-status contract/component. Final focused **13/13 passed**, unchanged timeouts; **74 isolated database cases passed**, including four readiness and 15 directory-filter cases. Typecheck/lint passed after query-option fixes | Latest full unit attempt: **298 passed, 4 failed /302**. Normal compilation passed in 39.7s before TypeScript rejected four newly added unsupported query options; those were corrected. Final unit/build/browser gates on the corrected combined revision remain open |
| F11 dashboard presentation | Approved HTML reference and responsive previews were inspected; source implementation is in progress in the integration session | Reference layout checks are not proof that the React application is integrated, accessible or release-verified |
| Table scrolling, F02/F06 | Component **2/2** passed; first responsive browser run **2 passed, 2 failed** in 44.7s. Mobile passed; desktop scrolling/sticky-header/action assertions passed before a page-size-name assertion. Locator corrected | Follow-up **0 passed, 4 failed** before rendering due missing Prisma runtime. Stable rerun needed; no skipped assertions, longer timeouts or production quota changes |
| Pagination/action presentation | Focused footer **6/6** passed in 163.09s (environment/module startup dominated; assertions 6.495s). Read-only localhost checks verified page-size reset, distinct page two, Eye/Pencil/Trash, open/cancel Delete confirmation and no overflow at 320/768/1280px | These inspections made no employee writes and are not complete CRUD or current combined release evidence |

The `bf807e8` plus working-tree browser capture is historical: its production build failed on unfinished captured tests, then a development run returned **34 passed, 17 failed /51** in 1018.3s with one worker and no retries. Known causes included compilation delay, retrieval connection reset, quota-exceeding signup fixtures, stale locators and a production-only CSP assertion in dev mode. Its raw logs/source manifest were temporary local artifacts, not durable proof for later revisions.

## Verified historical feature checkpoints

These results establish the named slice/revision only. Do not add their counts together or substitute them for a current integrated run.

| Revision / scope | Recorded result | Qualification |
|---|---|---|
| `2140367`, F02/B02 directory/filter slice | Isolated **255/255 unit**, **15/15 database**, **2/2 built-browser**; typecheck, lint and normal Turbopack build passed. Shared-tree focused regressions **27/27**; earlier shared full unit **280/280** | Independent review found no blocker. Later main `cf3da2b` included extracted pagination/shared-session changes; these two browser journeys do not prove that later redesign |
| `1b4e1a5`, B01/B02/B03/B04/F08 pending-pay CSV | Full unit/type/lint/build passed; **53/53 isolated database** in 36.48s; **4/4 built CSV browser** in 2.9m. Private prepared file: 10,000 saved/fetched, every source field matched, all pending, reload persisted; original 10,001-row file rejected without writes | User-approved id mapping, optional salary, FR/BR/BRL/INTERN and 10,000-row cap. Private files/credentials excluded from Git. Configured Neon migration applied separately; post-migration employee count on that earlier target/checkpoint remained zero, so this was not the later demo migration or a production-data import |
| `18b14dd`, earlier alias-only CSV | **218/218 unit**, **47/47 database**, type/lint/build and three focused CSV browser journeys passed | Superseded for missing-pay behavior by `1b4e1a5`; not a current full-browser pass |
| `2a7e3d4`, clean local release baseline | **207/207 unit**, **45/45 database**, **34/34 built-browser**, **4/4 benchmark helpers**, typecheck/lint/build/start passed. Seed cases initially refused a populated target; rerun used a new empty migrated database | Clean local baseline only; predates current CSV/dashboard changes. No prior database was emptied |
| `2a7e3d4`, P01 | Exactly 10,000 synthetic employees, **63/63 measured reads**, complete export and separate 10,000-row import. Warm p95 directory/report/export **66.15/525.35/512.62 ms**; concurrency-two **81.43/1080.71/919.76 ms**; peak RSS **459.15 MiB**; preview/commit **459.58/6945.73 ms** | [Method, artifact and limits](performance.md). Local PostgreSQL17, not hosted SLA/capacity; import measurement predates initial-history writes. P02/P03 remain conditional |
| `3bac573` plus six owned welcome/policy files, F09/S02 | **43/43 production-browser** in 1.7m; seven focused cases, build and explicit typecheck passed; 320/768/1280px screenshots inspected | Excluded concurrent employee/import/schema work. Full local unit attempt **211/218**, seven timeouts; retry stopped after more failures. Host memory pressure observed, not proof of every cause. Hosted HTTPS/cookies still open |
| `c7a0dd2`, local development | Verified port3000 was serving stale `next start`; replaced only owned processes, then pinned explicit development port and checked Fast Refresh route availability | Environment changes still require restart; no promise that `npm start` reloads source |

Earlier auth rollback/session expiry/logout, admission, logging, seed and persisted analytics cases retain their commit-linked results in the [original execution record](archive/2026-10-15-documentation-history.md#source-docs-validation-md). Production dependency audit at `2a7e3d4` had **12 unresolved findings: 9 high, 2 critical, 1 moderate**. This is dated evidence, not a current scan or zero-risk disposition; [deployment.md](deployment.md#dependency-release-review) owns maintenance decisions.

## Deployment and operational evidence boundary

| Environment / task | Observed state | Acceptance still required |
|---|---|---|
| Legacy deployment `0000e67`, `comcentral.vercel.app` | Earlier notes record READY hosting and selected login/logout/revocation, seeded native report/export, cookie and denied-cron checks under `ankit85` | The user identified that identity as another person's account. Preserve as a dated legacy observation, **not current user-owned production acceptance** |
| User-owned hosted follow-up, reported by deployment session | `akshaydubey50`, team `akshaydubey50s-projects`, repository `akshaydubey50/comcentral`; replacement `dpl_9xaYrtta2WLb97JBn9MwuJ7ukNvb` at `cadc103`, [demo site](https://comcentral-six.vercel.app). Automatic Git deployments reached READY. Owner reports **13 hosted smoke checks passed**: login/logout/session revocation, 10,000 employees, native reports, full **1,169,306-byte** CSV export, secure cookies/headers and unauthenticated cron rejection | These are recorded deployment-owner observations, not re-execution by this documentation session. Full `cadc103` CI still failed; updated public registration/homepage/CSV, complete security/persistence-after-redeploy and final candidate acceptance remain D01/S02 |
| Migration/old-access follow-up, reported by deployment session | Salary-pending forward migration applied to preview/demo; every employee/history row hash unchanged, including 10,000 demo employees. ComCentral-only database password rotated, prior DB sessions terminated, fresh old direct/pooled logins refused and own-project private settings updated | Prior `ankit85` owner must remove its obsolete project/deployment. Do not reuse that account or revoked credentials. Credentials are absent from this record |
| FX / D02 | Local deterministic/persisted tests and cron configuration exist | Observe real provider snapshot and an actual authenticated daily scheduled invocation, including stale/failure recovery. A manual call or configured expression does not close daily scheduling |
| Monitoring / D03 | Redacted correlated logs/readiness and a runbook exist | Authorized destination, controlled detection/notification/recovery and retention evidence |
| Recovery / D05 | Target-safety and recovery procedures documented | Prove account backup capability; restore synthetic data into a separate target; verify relationships/counts and measure rollback/recovery |
| Repository demo / D04 | Reviewer walkthrough and setup instructions exist | Clean-checkout replay against the selected revision; record/replay video and link the verified owned deployment |

Do not reconcile conflicting old claims by simply choosing the most optimistic one. The [archive](archive/2026-10-15-documentation-history.md#deployment-owner-follow-up) preserves earlier readiness and the later replacement-deployment report. The deployment session owns current hosting work; its actively edited [handoff](vercel-deployment-checklist.md) is retained until that owner finishes, then should be merged here rather than becoming a second permanent status ledger.

## Reproducing the release gate

Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` against one fixed revision. Then run benchmark helpers, isolated integration, production-start and browser acceptance as described in the [README](../README.md#verification), [performance guide](performance.md) and [deployment runbook](deployment.md). Record the commit/source state, command, environment, actual pass/fail/skipped count, limitations and any cleanup. No application/production database may be an automated test target; use separate migrated ordinary/seed/browser `_test` databases.

Browser coverage must include public signup/login/logout/recovery, create/view/edit/archive/restore and reload persistence, all individual/combined filters and pagination/history, exact salary first/change/history/stale conflicts, CSV validation/preview/replacement/commit/rollback/10k retrieval, complete filtered export, report math/currency/tenure/outliers/FX failure, keyboard/mobile states and production CSP/exceptions. Real persistence and intercepted recovery cases must be identified separately. Hosted HTTPS, provider/schedule, notification and recovery evidence are additional gates.

## Documentation consolidation checks - C02/D04, 2026-10-15

Documentation-only slice: source-backed guide review, one history archive, one task board, focused index and dependency-free Markdown link checker. Application source/config/dependencies and deployment were excluded. `npm test`, typecheck, lint and build are **not rerun by this documentation session** while the independent integration session restores dependencies; historical application results above are not attributed to this change.

Recorded scoped results:

- `node --test scripts/check-docs.test.mjs`: **6/6 passed**, no failures/skips; regressions cover nested/parenthesized paths, reference links, ignored code, GitHub heading slugs, target/fragments and bounded collection.
- `node --check scripts/check-docs.mjs` and `node --check scripts/check-docs.test.mjs`: passed.
- `node scripts/check-docs.mjs`: passed after consolidation, including maintained docs, archived-source wrappers and active concurrent handoffs. The exact scanned count can grow as other sessions add documents.
- `python scripts/render-requirements.py`: passed; **655 Markdown words, one A4 page**, every source paragraph extracted and all text within page bounds. Rendered PNG visually inspected: no clipping/overlap; footer derives 15 October 2026 from the source rather than a stale hardcoded date.
- Source-backed guide review and `git diff --check`: passed; only expected Windows line-ending notices. Hash guards stopped deletion when an active deployment tracker changed; that owner-specific file remains intact. Fourteen duplicate sources were merged, with a short compatibility pointer retained for the active deployment owner's archived-readiness link.

The final commit identifies this documentation/guard slice; its commit message references C02/D04. Unrelated source, generated files, deployment handoff, demo assets and design previews are excluded from staging. This entry is not application release acceptance.
