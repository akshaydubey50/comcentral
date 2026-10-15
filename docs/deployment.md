# Deployment and operations runbook

This runbook describes how to release and operate ComCentral on Vercel with Neon PostgreSQL. It is a procedure, not proof that a particular revision is deployed. [Validation evidence](validation.md) is the only current release/deployment status, and [the task board](../tasks/todo.md) is the only current work list.

## Account and release preflight

1. Record the exact reviewed commit and its release-gate evidence before changing hosting or database state. Do not deploy a dirty working tree or infer readiness from a local build alone.
2. Confirm the active Vercel identity is controlled by the repository owner. The expected scope is GitHub user `akshaydubey50`, Vercel team `akshaydubey50s-projects` (`team_9mqKvto9iek9CpenWAv9PoEX`), project `comcentral` (`prj_zinRtRYoAfG0KVxDQ1fQ7rbfQeSk`) and repository `akshaydubey50/comcentral`. The project dashboard is `https://vercel.com/akshaydubey50s-projects/comcentral`.
3. If the CLI or dashboard shows `ankit85` or `ankit85s-projects`, stop before linking, configuring, deploying or reading secrets. That is a different person's account. Resolving its deployment or stored settings requires access from that account owner; do not work around the ownership boundary.
4. Confirm the Vercel project uses the Next.js preset, Node.js 24.x, root directory `.`, install command `npm ci`, build command `npm run build`, and the preset's default output directory. Keep migrations and seeding outside the build.
5. Verify the Git integration points to the reviewed repository/revision and that preview and production use separate secrets and database targets. Confirm the function region is close to the database region.
6. Do not select a paid plan or add-on without explicit approval.

## Provider constraints

The following provider facts were reviewed on 2026-10-15. They can change; verify the account plan and current official documentation immediately before relying on them.

- [Vercel Hobby](https://vercel.com/docs/plans/hobby) is for personal, non-commercial use. Confirm the assessment and repository ownership remain eligible; also check current [platform limits](https://vercel.com/docs/limits) and [Git deployment rules](https://vercel.com/docs/git).
- The configured `/api/cron/fx` schedule is `0 21 * * *`. At the review date, Hobby supported one daily invocation within the selected UTC hour rather than at an exact minute. Recheck [cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs) and [cron pricing/limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).
- Neon Free advertised 100 projects, 100 CU-hours and 1 GB storage per project, ten branches, one manual snapshot, and instant restore for up to six hours or 1 GB of changes. Scheduled backups were not included. These were provider-wide limits, not proof of this account's enabled controls. Recheck [Neon pricing](https://neon.com/pricing), [plan limits](https://neon.com/docs/introduction/plans), and [backup and restore](https://neon.com/docs/guides/backup-restore).
- Vercel Hobby runtime logs were retained for one hour at the review date. Confirm current retention in [Vercel runtime logs](https://vercel.com/docs/logs/runtime) and capture time-sensitive evidence promptly.

## Environment isolation and configuration

| Environment | Database target | Rules |
| --- | --- | --- |
| Local and automated tests | Local or disposable `TEST_DATABASE_URL` only | Never point tests, seed verification or destructive setup at preview or demo. Keep URLs in ignored local settings. |
| Preview | Dedicated preview database, currently named `comcentral_preview_demo` | Keep it separate from the 10,000-row demo. Apply migrations deliberately outside the build; use only synthetic fixtures and disposable reviewer accounts. |
| Demo production | Dedicated synthetic database, currently named `comcentral_demo` | Never use it as a test target. Apply reviewed migrations once and keep any reviewer credentials private. |

Before treating targets as isolated, verify their project/branch, credentials and connection strings in Neon. Use a pooled TLS URL for `DATABASE_URL`, a matching direct TLS URL for `DIRECT_URL`, and place the database near the Vercel function region.

Configure values separately for preview and production:

| Variable | Requirement |
| --- | --- |
| `DATABASE_URL` | Pooled runtime connection to that environment's database. |
| `DIRECT_URL` | Matching direct connection used only by separately executed Prisma migration commands. |
| `BETTER_AUTH_SECRET` | Private random value of at least 32 characters; use different preview and production values. |
| `BETTER_AUTH_URL` | Exact stable HTTPS origin for that environment. Random preview origins do not automatically become trusted. |
| `CRON_SECRET` | Private production scheduler secret; use a separate value for any explicit preview cron test. |

Do not configure test-database URLs, seed acknowledgments or a long-lived provisioning password in Vercel. Public registration accepts a 5–128-character password and creates an HR account with immediate shared-workspace access. The optional provisioning script is separate and requires a 12–128-character `HR_PASSWORD`; if it creates a private reviewer account, supply that value only to the one-time process and remove it afterward.

## Dependency release review

Run the current lockfile audit for every release candidate and record its exact revision and result in `validation.md`. An advisory is not automatically a reachable application exploit, but tool-only or optional-peer findings still require an explicit maintenance decision. Do not use `npm audit fix --force`, silently change the approved stack, or describe the graph as vulnerability-free.

The following dispositions are the dated 2026-10-15 review and must be rechecked against the current lockfile and upstream releases:

| Dependency path | Release treatment |
| --- | --- |
| `csv-parse` | Runtime parser for untrusted employee CSV. It was pinned to `7.0.3`, beyond the fix for [GHSA-8cw4-87c7-c6xx](https://github.com/advisories/GHSA-8cw4-87c7-c6xx), after focused domain and persisted-import checks. Preserve the explicit header allowlist and rerun CSV checks after any change. |
| Prisma 7 CLI / `deepmerge-ts` | The reviewed path was the trusted Prisma configuration loader, not a request handler. Track the upstream [Prisma change](https://github.com/prisma/orm/pull/30189) and [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx); do not downgrade to Prisma 6 merely to clear the report. |
| Prisma Studio / `mysql2` | ComCentral uses PostgreSQL through `@prisma/adapter-pg`; the reviewed MySQL packages came through Studio. Keep Studio private and track the upstream [dependency change](https://github.com/prisma/orm/pull/30314), [authentication advisory](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr), and [compressed-protocol advisory](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3). |
| Vitest 3 / mocker / Tinypool | Test and CI tooling, with no public test UI/server. Plan a deliberate supported Vitest major migration, update removed configuration such as `environmentMatchGlobs`, and rerun component and database suites. Review the [Vitest migration guide](https://vitest.dev/guide/migration.html#migrating-to-vitest-4-0), [mocker advisory](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), and Tinypool [worker](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3) and [run-option](https://github.com/advisories/GHSA-85c8-ppgw-ccpr) notices before selecting versions. |
| Next ESLint chain / `fast-glob` / `micromatch` / `braces` | Lint-time paths driven by repository configuration. At the checkpoint, the [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) had no patched release. Do not downgrade Next or its lint config to an incompatible major; monitor supported upstream fixes. |

At commit `2a7e3d4`, `npm audit --omit=dev` reported 12 findings (9 high, 2 critical, 1 moderate) across these lint, Prisma and test-tooling chains. This is historical release evidence, not the current audit result. Optional peer edges can classify installed packages as `devOptional`, so `--omit=dev` can still report or physically install tool packages; assess actual imports/exposure as well as severity. See npm's [omit semantics](https://docs.npmjs.com/cli/commands/npm-audit/#omit).

## Deploy and verify

1. Confirm the fixed revision passes the required unit, type, lint, build, isolated database, production-start and browser gates. Record failed or unexecuted gates rather than substituting an older snapshot.
2. Apply the reviewed forward migration to preview first using its direct connection. Run preview acceptance, then apply the same migration to the demo database. Never migrate or seed from the Vercel build.
3. Deploy preview from the reviewed revision. Verify readiness, HTTPS security headers/cookies, public registration and session access, login/logout, protected-route denial, employee create/edit/archive/restore, salary history and stale-edit rejection, invalid/valid CSV import, complete filtered export, native reports and explicit approximate-USD failure/freshness states.
4. Deploy the same reviewed revision to demo production. Verify the expected labelled synthetic population and do not import confidential or unreviewed employee data.
5. Refresh the application, then redeploy the same artifact and confirm employee records and salary history persist. Measure only what the acceptance plan requires and record the environment and provider limits with each result.
6. Record the deployed URL, commit, date, plan/usage snapshot, migration version and actual checks in `validation.md`. Share reviewer credentials only through an approved private channel.

## Daily FX schedule

The application fetches the public Frankfurter v2 / ECB feed. It has no provider credential and no silent fallback. A manual refresh proves provider access only; it does not prove the schedule.

1. Configure `CRON_SECRET` only in the production environment and verify `/api/cron/fx` rejects a missing or incorrect bearer token.
2. Keep the `0 21 * * *` schedule in `vercel.json` unless a reviewed change updates both configuration and this procedure. It requests one invocation in the 21:00 UTC hour; provider timing is not guaranteed to the minute.
3. Observe an actual scheduled invocation. Inspect the route log and stored refresh-attempt record; verify attribution, rate date, freshness and that native salaries remain unchanged.
4. Record invocation time, outcome and snapshot/reference date in `validation.md`. If delivery is missed, record the gap. A later manual call is recovery evidence, not scheduled-run evidence.

## Monitoring and incident handoff

These are initial assessment thresholds. Assign a primary owner, backup owner and authorized alert destination before reporting alerting complete.

| Signal | Initial threshold | Required evidence |
| --- | --- | --- |
| Readiness | `/api/ready` is non-200 for two consecutive one-minute probes | Controlled preview failure reaches the authorized destination and recovery is observed. |
| Elevated server errors | Three same-route 5xx responses in five minutes, or at least 5% 5xx across 20 requests in five minutes | Alert links the time/route to redacted runtime logs without request bodies or credentials. |
| Overdue or failed FX | No scheduled attempt by 22:30 UTC, the latest scheduled attempt failed, or the latest successful validation is over 36 hours old; `MISSING` or `STALE` escalates immediately | Controlled overdue/failure scenario reaches the destination and records recovery. |

For an API failure, copy `x-request-id` from the response and filter runtime logs by request ID, allowlisted route and time. Logs contain allowlisted metadata rather than query strings, bodies, cookies, credentials or employee/salary payloads. Investigate within the verified retention window. If the selected Vercel plan cannot route native anomaly alerts, use an approved external monitor/destination or leave alert-delivery acceptance open; see [Vercel Alerts](https://vercel.com/docs/alerts).

## Backup, restore and rollback rehearsal

The proposed synthetic-demo objectives are RPO at most six hours, subject to the account's verified restore window, and RTO under 60 minutes. They remain objectives, not guarantees, until a dated rehearsal measures them.

1. Record the actual Neon plan, history window, snapshot controls and isolation. Do not infer scheduled backups from generic provider documentation.
2. Record migration version, employee count, salary-history count and orphan checks. Create a manual snapshot if the verified plan exposes one.
3. Restore to a new isolated branch with Neon restore. If acceptance requires a separate project/database, use a logical dump and restore to a fresh disposable target. Never overwrite the running demo database.
4. Point only a temporary local or preview deployment at the restored target. Verify schema/migrations, expected synthetic employee count, salary-history relationships, login and representative reads. Record elapsed time and oldest recoverable point.
5. Remove the temporary target only after evidence is captured and the running demo target is confirmed unchanged.
6. Rehearse application rollback separately: deploy a harmless reviewed successor, restore traffic to the immediately previous known-good Vercel deployment, then verify readiness, login, reads and the unchanged database. Recheck the current [rollback capability](https://vercel.com/docs/deployments/rollback-production-deployment) for the account plan.
7. Confirm the cron still targets the 21:00 UTC hour in `vercel.json`. Do not roll back the database schema or delete data; use forward-compatible migrations and a corrective deployment.

Record measured RPO/RTO, provider capability, restored-target checks, rollback result and remaining limits in `validation.md`. Until that evidence exists, recovery is prepared rather than verified.
