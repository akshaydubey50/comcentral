# Deployment runbook

Target: Vercel Next.js deployment plus Neon PostgreSQL. Deployment is not yet performed.

## Eligibility and configuration

Vercel Hobby is restricted to non-commercial personal use; confirm the assessment deployment qualifies for the account. Daily cron is supported on Hobby but its schedule can run within the selected hour rather than at the exact minute. Neon offers a free tier; verify actual storage/compute allowances and usage in the account before publishing. No paid plan or add-on should be selected automatically. Checked 2026-10-14: [Vercel Hobby](https://vercel.com/docs/plans/hobby), [cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Neon pricing](https://neon.com/pricing).

1. Create a dedicated Neon demo project and a separate disposable test database. Copy connection URLs only into ignored .env and the hosting environment settings. Keep the provider's TLS requirements.
2. Use the pooled URL for DATABASE_URL and the direct URL for DIRECT_URL. Place the DB region close to the Vercel function region.
3. Run migrations locally against the demo database; provision a private HR login; seed exactly 10,000 synthetic employees. Remove HR_PASSWORD from long-lived hosting settings after provisioning.
4. Import the reviewed Git repository into Vercel, choose Next.js and Node.js 24. Set DATABASE_URL, DIRECT_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL (exact HTTPS origin), CRON_SECRET. Use independent preview and production databases; do not run schema migrations from a preview build.
5. Build command: npm run build. Build generates Prisma client but does not apply database migrations or seed. vercel.json configures /api/cron/fx at 0 21 * * *.
6. Run authenticated read/write smoke checks, session expiry/logout tests, salary history/conflict check, invalid and valid CSV imports, complete filtered export, native insights and FX refresh. Verify blocked anonymous API/export access.
7. Check data remains after refresh and redeployment. Measure cold and warm request durations and database size; monitor free-tier usage.
8. Record deployed URL, exact commit, verification date and video in validation.md/README. Share reviewer credentials through an approved private channel, never in a public README.

Rollback: redeploy the previous known-good app version. Do not delete data or auto-roll back schema. Back up before future destructive migrations and use forward-compatible schema changes.
