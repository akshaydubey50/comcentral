# Vercel readiness review, 2026-10-15

Tasks: V02, D01, D02, S02; operational follow-ups D03 and D05.

**Verdict:** Vercel is compatible with this application, but the current project is not ready for a verified release. Hosting settings are incomplete, the published source is old, and another session changed application contracts and schema while the local checks ran. No deployment, remote setting change, migration, seeding, account creation or Git push was performed by this review.

## Verified account and hosting state

| Item | Observed result |
| --- | --- |
| Vercel login | Existing CLI session: `ankit85` |
| Existing project | `ankit85s-projects/comcentral` |
| Node / root directory | `24.x` / `.` |
| Framework preset | **Other**; must select **Next.js** |
| Vercel environment variables | **None configured** |
| Deployments | **None** |
| Repository | Public `akshaydubey50/comcentral` |
| Published main | `0000e67df46166461c75d1cc75cdb03eb79e6792`, verified with `git ls-remote` |
| Latest remote CI | [Failed browser step on that old commit](https://github.com/akshaydubey50/comcentral/actions/runs/38586455940); no current release evidence |
| Latest local commit observed | `3bac573`, 46 commits ahead of published main, plus concurrent uncommitted work |

The review linked a temporary folder to the existing Vercel project solely to list environment-variable names. The application checkout was not linked or deployed. Plan entitlements, Git integration, function region and backup controls were not verified in the provider consoles.

## Verified database preparation

Read-only transactions confirmed the following databases on the configured Neon endpoint. No employee records, connection strings, passwords or hashes were printed.

| Database | Employees | HR users | Salary-history records | FX snapshots | Initial migration |
| --- | ---: | ---: | ---: | ---: | --- |
| `comcentral_demo` | 10,000 | 0 | 0 | 0 | Applied checksum matches `202610140001_init` |
| `comcentral_preview_demo` | 0 | 0 | 0 | 0 | Applied checksum matches `202610140001_init` |

The demo seed marker also records 10,000 employees. Its actual CSV export measured **1,169,306 bytes**, below Vercel's documented 4.5 MB function response limit. The export read used a read-only connection and emitted only its byte count. Larger populations or longer fields can exceed that limit; this is evidence for the existing synthetic dataset only. [Vercel function limits](https://vercel.com/docs/functions/limitations)

The local environment currently selects `neondb`, rather than either dedicated deployment database, and its auth URL is localhost. `DIRECT_URL` and `TEST_DATABASE_URL` are absent. Do not copy the local environment wholesale into hosting. Existing databases share an endpoint; their presence does not prove separate roles, branches, account quotas or backup policies.

During the review, another session added an uncommitted `202610150001_salary_pending_imports` migration and changed salary nullability, supported currency/employment values and shared contracts. The initial-migration check above is **not** verification of that new schema. Review and test the completed migration in isolation, then verify its application to preview before demo.

## Exact hosting setup still needed

| Setting | Required configuration |
| --- | --- |
| Framework preset | Next.js |
| Node.js | 24.x, matching the checked local runtime and CI |
| Root directory | `.` |
| Install command | `npm ci` |
| Build command | `npm run build`; already runs `prisma generate && next build` |
| Output directory | Next.js preset default; remove any `public` or static-output override |
| Function region | Verify and place near the Neon database |
| Release source | One reviewed, committed snapshot with passing checks; publish that snapshot if using Git integration |

These settings follow the [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build) and [supported Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions). Database migrations and seeding must remain outside the Vercel build.

| Variable | Production demo | Preview |
| --- | --- | --- |
| `DATABASE_URL` | Pooled TLS connection to `comcentral_demo` | Pooled TLS connection to `comcentral_preview_demo` |
| `DIRECT_URL` | Matching direct connection for separately executed Prisma migration commands | Matching direct preview connection for migration commands |
| `BETTER_AUTH_SECRET` | Private random secret, at least 32 characters | A separate private secret |
| `BETTER_AUTH_URL` | Exact final HTTPS application origin | Exact HTTPS preview origin used for verification |
| `CRON_SECRET` | Private random secret for the production scheduler | Only if explicitly testing the protected route; use a separate value |

`DIRECT_URL` is a migration-tool setting; request handling uses `DATABASE_URL`. Do not add test database URLs, seed acknowledgments or a long-lived provisioning password to production. Public registration can create the first HR user with immediate access; a private reviewer login can also be provisioned separately. This does not require adding email verification, an invitation service or a registration approval gate.

Auth trusts the single configured origin, so random preview URLs will not automatically work with a different `BETTER_AUTH_URL`. Use a consistent preview URL or update that environment's configured origin deliberately. A custom domain is optional; the assigned Vercel domain can be used.

## Local checks executed in this review

| Check | Result and limit |
| --- | --- |
| `npm run typecheck` | Passed before later concurrent contract/schema edits |
| `npm run lint` | Passed before later concurrent edits |
| `npm run build` | Passed with normal Turbopack and Prisma generation; not evidence for changes made afterward |
| Production startup/readiness | `node --env-file=.env scripts/smoke-production.mjs` passed against the configured application database; owned local server stopped |
| First serial `npm test` | 216 passed, 2 timed out in 254.07 seconds |
| Focused timeout investigation | Both affected files passed: 9/9 tests, 25.17 seconds, without changing assertions or timeout |
| Full rerun | 208 passed, 14 failed across 222 discovered tests in 247.10 seconds while source/tests/schema changed concurrently; not a verified release candidate |
| `npm audit --omit=dev --json` | 7 findings: 4 high, 2 critical, 1 moderate; not a clean audit |
| Database integration/browser suites | Not rerun here: no isolated `TEST_DATABASE_URL` was configured; deployment databases were not used as integration-test targets |

The initial timeouts were in salary conflict reload and grouped pay statistics. Build/test contention and approximately 1.34 GiB free memory were observed, but the focused pass does not establish the root cause or replace a full pass. During the rerun, changes appeared in security-policy tests, FX/enum contracts and salary-pending import behavior. Preserve the other session's work and rerun all required gates after it reaches a stable commit.

The dependency findings remain in the Prisma CLI/Studio and Vitest tool chains described in [dependencies.md](dependencies.md). Optional peer paths cause some of these tools to appear even with `--omit=dev`. Their recorded exposure review is not a zero-vulnerability claim. Resolve or explicitly retain the documented holds during release review; do not use a forced downgrade as a shortcut.

## Verification after configuration

1. Finish and review the active changes, including the new migration; run unit, typecheck, lint, build, isolated integration and browser checks on one fixed revision. Obtain current CI evidence.
2. Configure the existing Vercel project and separate environment values, then deploy preview against its own database. Verify readiness, HTTPS headers/cookies, registration/login/logout, authorization, employees, salary history, import/export and reporting.
3. Deploy the same reviewed revision to the synthetic demo database. Verify records and salary history survive a redeployment. The approved public-HR/shared-workspace model is for the synthetic assessment, not confidential multi-company data.
4. Perform a real FX refresh and inspect the first actual scheduled invocation. Zero snapshots currently exist. `vercel.json` schedules `/api/cron/fx` at `0 21 * * *`; Vercel sends `CRON_SECRET` as bearer authorization. A manual refresh does not prove scheduling. [Cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
5. Verify provider plan/quotas, logs, an authorized alert destination and isolated backup/restore plus application rollback. D03/D05 remain unverified.

The configured once-daily schedule fits Hobby's daily restriction; execution may occur within the selected hour. Hobby is restricted to personal, non-commercial use, so confirm this assessment's eligibility and the actual account plan before launch. No purchase is needed merely to complete the configuration review. [Cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Hobby plan](https://vercel.com/docs/plans/hobby)

No new credentials need to be pasted into chat. The existing account and database access are available; remaining inputs are the final deployment origin, confirmation of the intended Vercel account/scope if different from the existing project, and the monitoring destination for operational follow-up.
