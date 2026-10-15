# ComCentral

An HR workspace for managing annual base salaries for 10,000 employees across countries. Built independently with Next.js, TypeScript, Material UI, Node.js Route Handlers and PostgreSQL.

**Status:** Core HR features and public registration are implemented; audit improvements and delivery are in progress. Verification includes separate isolated-database, real-browser and frontend-fixture runs with different snapshot limits. Current results and unresolved checks are recorded in [validation](docs/validation.md).

**Reviewing the project?** Start with the [reviewer guide](docs/reviewer-guide.md), [product specification](PROJECT_SPEC.md) and [AI contribution record](docs/ai-use.md). They connect requirements, decisions, corrections, tests and incremental commits.

## Run locally

Use Node.js 24 and npm. From Git Bash:

```bash
cd /d/akshay/comcentral
npm install
test -f .env || cp .env.example .env
```

Populate .env privately: pooled DATABASE_URL, direct DIRECT_URL, BETTER_AUTH_URL=http://localhost:3000, unique random BETTER_AUTH_SECRET and CRON_SECRET, and your HR_EMAIL/HR_NAME/HR_PASSWORD. Generate each secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Use a dedicated demo database with synthetic data. Public registration is available at `/register` with immediate shared HR access. Passwords use 5-128 characters, as requested. The provisioning script below remains available for administrator setup.

```bash
npm run db:generate
npm run db:migrate
npm run db:provision
COMCENTRAL_SEED_TARGET=demo COMCENTRAL_SEED_DATABASE_ACK=comcentral_demo npm run db:seed
npm run dev
```

For that seed command, DATABASE_URL must name `comcentral_demo`; change the acknowledgment to the exact name of your dedicated database ending `_demo`. Seeding refuses production mode, missing acknowledgment and unrelated populated targets. Count checks and insertion run under one transaction and table lock; subsequent normal demo imports remain allowed. A repeat seed refuses a changed population instead of deleting records. Open http://localhost:3000 and sign in or create an account at /register. Use synthetic data only.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Unit/component tests run offline. Database tests require an isolated TEST_DATABASE_URL and a separate empty SEED_TEST_DATABASE_URL (both ending `_test`, migrated with `npm run db:migrate`): `npm run test:integration`. Neither may target the application database. Browser journeys need a locally running application backed by a local `_test` database, E2E_EMAIL and E2E_PASSWORD; install Chromium with `npx playwright install chromium`, then run `npm run test:e2e`. Enable the real signup case with E2E_ALLOW_REGISTRATION=true. Never use real employee data in tests.

## Product and engineering artifacts

- [One-page requirements](docs/requirements.pdf) / [Markdown](docs/requirements.md)
- [Detailed product specification](PROJECT_SPEC.md) and [reviewer guide](docs/reviewer-guide.md)
- [Architecture and trade-offs](docs/architecture.md)
- [API contract](docs/api-contract.md) and [analytics rules](docs/analytics-rules.md)
- [Implementation plan](docs/implementation-plan.md) and [AI-use record](docs/ai-use.md)
- [Full PayScope audit](docs/payscope-comparison.md), [original reference notes](docs/reference-review.md), and [audit checklist](tasks/todo.md)
- [Deployment runbook](docs/deployment.md), [validation evidence](docs/validation.md), [demo script](docs/demo-script.md)

The requirements PDF is generated from its Markdown source with `python scripts/render-requirements.py` using the optional documentation tools ReportLab and PyMuPDF. The script checks that every paragraph is present, fits on one page, and stays inside the page bounds, then writes a preview to the operating system's temporary directory. These Python tools are not application runtime dependencies.
