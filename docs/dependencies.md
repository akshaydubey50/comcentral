# Dependency review, 2026-10-15

V02 examines actual dependency paths as well as audit severity. An audit finding is not automatically proof of a reachable application exploit; a toolchain-only finding is still recorded and requires maintenance. The reviewed application uses Next.js, PostgreSQL/Prisma 7 and Better Auth. Do not use `npm audit fix --force` to silently change that architecture or weaken its checks.

| Package at review | Exposure and disposition |
|---|---|
| csv-parse 6.2.1 | Used for untrusted employee CSV input. ComCentral uses array records (`columns:false`) and explicit allowed headers, avoiding the reported columns/prototype preconditions. Updated and pinned to **7.0.3** in `bca6038`; four domain and five persisted-import tests passed afterward. |
| deepmerge-ts 7.1.5 via Prisma 7.10.0 | Used by the trusted Prisma CLI configuration loader. No request path merges untrusted object graphs through this package. Retain Prisma 7 pending its upstream patched release; do not downgrade to Prisma 6 merely to satisfy npm's suggested automatic fix. |
| mysql2 3.15.3 via Prisma | Prisma Studio's MySQL dependency. This application uses `@prisma/adapter-pg` and `pg`; it does not connect through mysql2. Track the upstream Prisma patch and keep Studio private. |
| Vitest 3.2.7, @vitest/mocker 3.2.7, tinypool 1.1.1 | Test/CI execution only; no public Vitest UI/server is started. Plan a deliberate Vitest 4.1.11-or-newer migration, replacing removed `environmentMatchGlobs` with projects and rerunning both component and database suites. The current local-release milestone retains the existing runner and records this unresolved tooling risk. |

The parser [advisory](https://github.com/advisories/GHSA-8cw4-87c7-c6xx) is fixed from 7.0.2. The [maintainer changelog](https://github.com/adaltas/node-csv/blob/master/packages/csv-parse/CHANGELOG.md) says the 7.0.0 major was accidental and did not introduce breaking changes; 7.0.3 includes type corrections. This supports the small parser upgrade rather than a broad dependency refresh during the time-constrained release check.

Prisma's upstream [deepmerge change](https://github.com/prisma/orm/pull/30189) and [MySQL dependency change](https://github.com/prisma/orm/pull/30314) provide the follow-up path. Review their release status before upgrading; the audit's suggested Prisma 6 downgrade is incompatible with the approved Prisma 7 design. The relevant notices are [deepmerge](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), [MySQL authentication](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr), and [compressed protocol](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3).

For the test runner, follow the [Vitest migration guide](https://vitest.dev/guide/migration.html#migrating-to-vitest-4-0) and the [mocker](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), [Tinypool worker options](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3), and [Tinypool run options](https://github.com/advisories/GHSA-85c8-ppgw-ccpr) notices. Do not describe the current dependency graph as vulnerability-free.

`npm audit --omit=dev` still includes these tools because optional peer edges from Better Auth/Prisma classify installed nodes as `devOptional`, rather than exclusively development dependencies. A production installation may physically contain the packages even though the running Next/PostgreSQL code does not import those tool entrypoints. See npm's [omit semantics](https://docs.npmjs.com/cli/commands/npm-audit/#omit). The current graph and full release results belong in [validation.md](validation.md).
