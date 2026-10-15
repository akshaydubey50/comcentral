# ComCentral

ComCentral is an HR workspace for maintaining annual contractual base pay across countries. It is designed and measured for a 10,000-employee workload, and each CSV import accepts at most 10,000 rows. It provides employee records, versioned salary history, CSV migration, native-currency reporting, approximate dated USD reporting and review-oriented analytics. It is not a payroll, tax or automated pay-decision system.

Release readiness and hosted observations are revision-specific. Read [validation.md](docs/validation.md) for the current evidence and open checks, or use the [reviewer guide](docs/reviewer-guide.md) for a short assessment path. A prepared walkthrough is not a completed demo video.

## Run locally

Requirements:

- Node.js `>=22.12.0` and npm. Historical local evidence used Node.js `24.18.1`.
- PostgreSQL with a dedicated application database.

From PowerShell:

```powershell
npm ci
if (-not (Test-Path -LiteralPath '.env')) {
  Copy-Item -LiteralPath '.env.example' -Destination '.env'
}
```

Edit `.env` privately. Configure a pooled `DATABASE_URL`, matching direct `DIRECT_URL`, `BETTER_AUTH_URL=http://localhost:3000`, and unique random `BETTER_AUTH_SECRET` and `CRON_SECRET` values. `BETTER_AUTH_SECRET` must contain at least 32 characters. Do not commit or display the file.

Generate the Prisma client, apply reviewed migrations and start development:

```powershell
npm run db:generate
npm run db:migrate
npm run dev
```

Open `http://localhost:3000/`. Anonymous visitors see the product introduction; signed-in visitors see the workspace. Create an HR account at `/register` with a 5-128-character password. Registration creates a session and grants immediate access to the approved shared workspace without invitation, administrator approval or email verification.

Initial seeding and private HR provisioning are optional.

### Optional synthetic demo seed

The seed inserts exactly 10,000 deterministic synthetic employees. It is unnecessary for an empty local start. Before running it, verify that the resolved `DATABASE_URL` is the intended disposable target. The database name must end in `_demo` or `_test`, and the acknowledgement must match that name exactly; these checks do not prove that a database is safe to modify.

Example for a dedicated database named `comcentral_demo`:

```powershell
$env:COMCENTRAL_SEED_TARGET = 'demo'
$env:COMCENTRAL_SEED_DATABASE_ACK = 'comcentral_demo'
try {
  npm run db:seed
} finally {
  Remove-Item Env:COMCENTRAL_SEED_TARGET -ErrorAction SilentlyContinue
  Remove-Item Env:COMCENTRAL_SEED_DATABASE_ACK -ErrorAction SilentlyContinue
}
```

Seeding refuses production mode, an unacknowledged target, an incompatible database suffix and unrelated populated data. It never supplies production data.

### Optional HR provisioning

Public registration is the primary access path. For a one-time private account, set `HR_EMAIL`, `HR_NAME` and `HR_PASSWORD` privately in the current process and run `npm run db:provision`. The provisioning password must contain 12-128 characters. Provisioning creates credentials without a browser session and refuses to overwrite an existing email; remove the process variables afterward.

## Development server

`npm run dev` fixes the address at port 3000 and uses Next.js Fast Refresh. If the port is occupied, startup fails visibly instead of selecting another port. Restart after environment changes; Prisma schema changes also require reviewed client generation and migration.

`npm start` serves the last production build and does not watch source files. Use it only after `npm run build` when checking the production artifact.

## Verification

The required local quality commands are:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

Unit and component tests run offline. Database checks require two separate, migrated, disposable databases: `TEST_DATABASE_URL` for integration fixtures and an initially empty `SEED_TEST_DATABASE_URL` for seed concurrency/rollback checks. Both names must end in `_test`; neither may point to the application, preview or demo database.

```powershell
npm run test:integration
```

Browser journeys require a locally running application backed by a dedicated `_test` database plus `E2E_EMAIL` and `E2E_PASSWORD`. Install the configured Playwright Chromium once, then run:

```powershell
npx playwright install chromium
npm run test:e2e
```

Set `E2E_ALLOW_REGISTRATION=true` only when intentionally exercising real signup against the disposable browser-test database. The production smoke test also requires an isolated database and private `BETTER_AUTH_SECRET`; it starts and stops its own temporary server after a successful build:

```powershell
npm run test:production
```

Documentation links and checker behavior are verified independently:

```powershell
node scripts/check-docs.mjs
node --test scripts/check-docs.test.mjs
```

## Documentation

The curated documentation index is [docs/README.md](docs/README.md). Product acceptance is in [PROJECT_SPEC.md](PROJECT_SPEC.md), contributor rules are in [AGENTS.md](AGENTS.md), and current work is tracked only in [tasks/todo.md](tasks/todo.md).
