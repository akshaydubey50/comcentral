# Deployment runbook

Selected no-purchase target: Vercel Hobby for the Next.js application and Neon Free for PostgreSQL. This is suitable for a personal, non-commercial assessment and matches the existing Node deployment and daily cron configuration. It is not yet a deployed or account-verified environment.

Current preparation state (2026-10-15): two dedicated Neon database targets exist but are not connected to a deployment. `comcentral_demo` has the reviewed migration and exactly 10,000 synthetic employees; `comcentral_preview_demo` has the reviewed migration and zero employees. Their account plan, regions, connection isolation, backup controls and current usage still need verification in the provider console. No deployed URL, scheduled invocation or notification delivery has been verified.

## Provider constraints to verify before deployment

- Vercel Hobby is limited to personal, non-commercial use. Confirm repository ownership is eligible for Hobby Git import; a private organization repository requires a different arrangement. See [Vercel Hobby](https://vercel.com/docs/plans/hobby), [platform limits](https://vercel.com/docs/limits) and [Git deployment rules](https://vercel.com/docs/git).
- The configured `/api/cron/fx` job remains `0 21 * * *`. Hobby supports daily jobs but may invoke them at any point from 21:00 through 21:59 UTC. See [Vercel cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs).
- Current Neon Free documentation advertises 100 projects, 100 CU-hours and 1 GB storage per project, ten branches, one manual snapshot, and instant restore for up to six hours or 1 GB of changes. Scheduled backups are not included on Free. These are provider-wide limits, not proof of this account's plan or enabled controls. Verify them at execution. See [Neon pricing](https://neon.com/pricing), [plan limits](https://neon.com/docs/introduction/plans) and [backup and restore](https://neon.com/docs/guides/backup-restore).
- Vercel Hobby runtime logs are retained for one hour. Capture operational evidence promptly and confirm the actual account retention before relying on it. See [Vercel runtime logs](https://vercel.com/docs/logs/runtime).
- Do not select a paid plan or add-on without explicit approval.

## Environment isolation

| Environment | Database target | Rules |
| --- | --- | --- |
| Local and automated tests | Local or disposable `TEST_DATABASE_URL` only | Never point tests, seed verification or destructive setup at preview or demo. Keep all URLs in ignored local settings. |
| Preview | `comcentral_preview_demo` | Keep disposable and separate from the 10,000-row demo. Apply migrations deliberately outside the preview build; do not seed production-like reviewer credentials. |
| Demo production | `comcentral_demo` | Synthetic data only. Apply reviewed migrations once, provision the private reviewer account, and keep exactly 10,000 employees. Never reuse it as a test target. |

Before treating the prepared targets as isolated, verify their project/branch, credentials and connection strings in Neon. Use a pooled URL for `DATABASE_URL`, a direct URL for `DIRECT_URL`, and place the database region close to the Vercel function region.

## Deploy and verify

1. Record the reviewed commit and clean release-gate results. Confirm the two database targets and provider plan in the consoles without copying credentials into documentation.
2. Verify the prepared migration on preview first. Run the preview smoke flow, then verify the same reviewed migration on the demo database. Apply future migrations in that order. Builds must run `npm run build`; they must not migrate or seed.
3. Provision a private HR account and verify the existing 10,000 synthetic employees in the demo target. Remove `HR_PASSWORD` from long-lived hosting settings after provisioning.
4. Import or link the reviewed repository in Vercel using Next.js and Node.js 24. Configure production and preview separately: `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` using the exact HTTPS origin, and `CRON_SECRET`.
5. Verify public registration and immediate session access, login/logout, employee create/edit/archive/restore, salary history and stale-edit rejection, invalid and valid CSV import, complete filtered export, native reports and approximate USD behavior. Confirm anonymous API/export access is blocked.
6. Refresh, then redeploy the same reviewed artifact and confirm persisted records and salary history remain. Measure cold and warm requests, database size and provider usage.
7. Record deployed URL, commit, verification date, plan/usage snapshot and evidence in `docs/validation.md`. Share reviewer credentials only through an approved private channel.

## Daily FX schedule

The application fetches the public Frankfurter v2 / ECB feed; no provider credential or silent fallback is used. A manual refresh proves provider access but does not prove scheduling.

1. Confirm `CRON_SECRET` is configured only in the production environment and the deployed cron route rejects a missing or incorrect bearer token.
2. Keep the production schedule at 21:00 UTC. After the first deployment, wait for an actual scheduled invocation and inspect the `/api/cron/fx` runtime log and stored refresh-attempt record.
3. Verify the attempt is attributed and dated, native salaries remain unchanged, and approximate USD reports show the resulting freshness state.
4. Record the invocation time, outcome and snapshot/reference date. If delivery is missed, record the gap; a later manual call is recovery evidence, not scheduled-run evidence.

## Monitoring baseline and ownership handoff

These are initial assessment thresholds to configure and rehearse after deployment. Named owners, backup owners and an authorized alert destination have not been supplied and must be assigned before D03 can be reported complete.

| Signal | Initial threshold | Primary owner | Backup owner | Alert destination | Current state |
| --- | --- | --- | --- | --- | --- |
| Readiness | `/api/ready` returns non-200 for two consecutive one-minute probes | Pending assignment | Pending assignment | Not configured | Endpoint exists; hosted probe unverified |
| Elevated server errors | Three same-route 5xx responses in five minutes, or at least 5% 5xx across 20 requests in five minutes | Pending assignment | Pending assignment | Not configured | Structured logs exist; alert unverified |
| Overdue or failed FX | No scheduled attempt by 22:30 UTC; latest scheduled attempt failed; or latest successful validation is over 36 hours old. Treat `MISSING` or `STALE` as immediate escalation | Pending assignment | Pending assignment | Not configured | Daily route exists; alert unverified |

For a reported API failure, copy its `x-request-id`, then filter runtime logs by request ID, route and time. Logs contain allowlisted request metadata rather than bodies or credentials. On Hobby, investigate within the documented one-hour retention window. A controlled preview readiness failure and an overdue/failed FX scenario must each reach the authorized destination before notification delivery is claimed. Native configurable Vercel anomaly alert routing requires a qualifying paid observability plan, so the no-purchase path needs an approved external monitor/destination or must leave this D03 item explicitly pending. See [Vercel Alerts](https://vercel.com/docs/alerts).

## Backup, restore and rollback rehearsal

Proposed synthetic-demo objectives are RPO of at most six hours, subject to the account's verified restore window, and RTO under 60 minutes. They remain objectives, not measured guarantees, until the account capability and rehearsal result are recorded.

1. In Neon, record the actual plan, history window, snapshot controls and target isolation. On Free, expect at most a six-hour/1-GB instant-restore window and one manual snapshot; do not claim scheduled backups.
2. Before the exercise, record migration version, employee count, salary-history count and any orphan check. Create a manual snapshot if the account exposes it.
3. Restore to a new isolated branch using Neon multi-step restore. If the acceptance review requires a separate project/database rather than a branch, use a logical dump and restore into a fresh disposable target. Never overwrite `comcentral_demo`.
4. Point only a temporary local or preview deployment at the restored target. Verify schema/migrations, the 10,000 employee seed count, salary-history relationships, login and representative read paths. Record elapsed time and the oldest recoverable point.
5. Delete the temporary target only after evidence is captured and the running demo target is confirmed unchanged.
6. Rehearse application rollback separately: deploy a harmless reviewed successor, roll production traffic back to the immediately previous known-good Vercel deployment, then verify readiness, login, reads and the unchanged database. Hobby rollback is limited to the immediately previous production deployment. See [Vercel rollback](https://vercel.com/docs/deployments/rollback-production-deployment).
7. After rollback, confirm the 21:00 UTC cron configuration still matches `vercel.json`. Do not roll back the database schema or delete data; use forward-compatible migrations and a corrective deployment.

Record measured RPO/RTO, provider capability, restored-target checks, rollback result and remaining limits in `docs/validation.md`. Until that evidence exists, backup availability and recovery remain prepared rather than verified.
