# Verification evidence

Verified on 2026-10-14 with Node 24.18.1, Next.js 16.4.0, Prisma 7.10.0 and TypeScript 5.9.3.

| Check | Current evidence |
|---|---|
| One-page requirements | 490 words; rendered one-page A4 PDF; visually inspected without clipping |
| Prisma generation/schema | Client generation and Prisma validate passed |
| Unit/component tests | 34 passed across 11 files; Vitest single-worker run exited 0 in 23.85s |
| TypeScript | Standalone check passed after backend corrections; final production build also completed TypeScript checking |
| Lint | Full ESLint check passed with no errors or warnings |
| Production build | Next.js optimized production build passed; all 16 static pages generated and API routes built |
| Database integration | Pending isolated PostgreSQL connection; no DB tests executed |
| Browser journeys | Built app starts on localhost:3000; login page visually checked at desktop size with no browser error/warning logs. Authenticated workflows pending database migration and HR provision |
| 10,000-employee seed/performance | Deterministic seed unit test passed; database seed and performance measurement not yet run |
| Deployed software | Not deployed |
| Demo video | Script prepared; recording pending verified runtime |

## Commands and limitations

The successful unit run used `node node_modules/vitest/vitest.mjs run --maxWorkers=1 --no-file-parallelism --reporter=dot`. Lint used `node node_modules/eslint/bin/eslint.js .`. Prisma generation ran separately before `node node_modules/next/dist/bin/next build`. These call the same tools used by the npm scripts.

The initial unit/lint attempts were terminated at 45 seconds and are not counted as passes. Backend focused tests passed 18/18. Full execution then found a DOM matcher registration problem, a CSV file-read readiness race, and React effect-based form resets. Fixes now preserve unsaved drafts and opening salary versions during background refetch, reset dialogs on reopen, and pass the selected CSV contents explicitly to mutations. Regression tests cover these behaviors.

The npm dependency installation is complete. The original frontend worker and its same-model replacement encountered Windows sandbox setup failures; the coordinator executed the tests and applied fixes after the replacement's analysis. No model escalation occurred.

Remaining setup: the Neon HR Portal project is visible on the Free plan, but DATABASE_URL, DIRECT_URL and TEST_DATABASE_URL remain blank in the local ignored .env as last checked. No migration, provision, seed or live FX-provider call is claimed. Vitest prints a non-failing deprecation notice for environmentMatchGlobs.
