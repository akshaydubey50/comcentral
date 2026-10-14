# ComCentral

An HR workspace for managing annual base salaries for 10,000 employees across countries. Built independently with Next.js, TypeScript, Material UI, Node.js Route Handlers and PostgreSQL.

**Status:** frontend and backend implemented; 34 unit/component tests, lint, TypeScript and production build pass. Database-backed verification, deployment and demo recording remain pending. See [validation](docs/validation.md).

## Run locally

Use Node.js 24 and npm. From Git Bash:

```bash
cd /d/akshay/assesment
npm install
test -f .env || cp .env.example .env
```

Populate .env privately: pooled DATABASE_URL, direct DIRECT_URL, BETTER_AUTH_URL=http://localhost:3000, unique random BETTER_AUTH_SECRET and CRON_SECRET, and your HR_EMAIL/HR_NAME/HR_PASSWORD. Generate each secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Use a dedicated demo database with synthetic data. No public signup exists.

```bash
npm run db:generate
npm run db:migrate
npm run db:provision
npm run db:seed
npm run dev
```

Open http://localhost:3000 and sign in with the provisioned HR account. The deterministic seed is unit-tested but has not yet run against the database. It refuses a nonempty employee database; use a dedicated assessment database.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Unit/component tests run offline. Database tests require an isolated TEST_DATABASE_URL (database name ending _test): `npm run test:integration`. Browser journeys need the running application, E2E_EMAIL and E2E_PASSWORD; install Chromium with `npx playwright install chromium`, then run `npm run test:e2e`. Never use real employee data in tests.

## Product and engineering artifacts

- [One-page requirements](docs/requirements.pdf) / [Markdown](docs/requirements.md)
- [Architecture and trade-offs](docs/architecture.md)
- [API contract](docs/api-contract.md) and [analytics rules](docs/analytics-rules.md)
- [Implementation plan](docs/implementation-plan.md) and [AI-use record](docs/ai-use.md)
- [Reference analysis](docs/reference-review.md)
- [Deployment runbook](docs/deployment.md), [validation evidence](docs/validation.md), [demo script](docs/demo-script.md)
