# Reproducible workload measurements

This document preserves the reproducible P01 method and the scoped `2a7e3d4` baseline. It is not current release or deployment status; use [validation.md](validation.md) for that and [the task board](../tasks/todo.md) for open work. The benchmark measures the approved 10,000-employee dataset before considering SQL aggregation or streaming export. It refuses remote databases, missing acknowledgments, application targets and reused import/benchmark targets. It emits aggregate timings and memory, never employee rows, credentials, cookies or connection URLs.

Run `npm run test:benchmark` for offline safety/statistics checks. For a real run, build the reviewed application first and provide these variables privately in the process environment:

| Variable | Required value |
|---|---|
| DATABASE_URL / DIRECT_URL | The application database identity, used only to reject accidental reuse; DATABASE_URL is mandatory |
| BENCHMARK_DATABASE_URL | A separate local PostgreSQL database ending `_test`, migrated and containing exactly 10,000 active `acme-synthetic-v1` employees with its matching seed marker |
| BENCHMARK_CONFIRM_ISOLATED | `YES` |
| BENCHMARK_IMPORT_DATABASE_URL | A different migrated local `_test` database for the temporary large import |
| BENCHMARK_IMPORT_CONFIRM | `YES` |
| BENCHMARK_AUTH_SECRET | A private test secret of at least 32 characters |

Then run `npm run benchmark`. The tool starts the built Next process on a loopback port, creates four temporary test HR accounts, and runs list/report/export workloads. Each endpoint has one first request, ten warm sequential requests and ten requests at concurrency two. Export calls are distributed across users so the real durable request limits remain enabled. The first request is **not** evidence of a provider/serverless cold start; the database and operating-system caches may already be warm.

A private IPC preload samples the actual application process RSS/heap every 100ms. Reported memory is observed peak memory across the run, not isolated per-endpoint allocation. A second application process previews and commits 10,000 uniquely named rows on the import target, verifies the persisted count, and removes only its own rows/users. Calls, database statements and shutdown have bounded deadlines. Existing database records are not reset or reseeded by the benchmark.

The report identifies the revision, dirty-tree state, Node/platform/CPU count, exact synthetic population, sample counts, nearest-rank p50/p95, maximum successful latency, error rate and application memory. Ten observations per phase make p95 close to the maximum; these are small reproducible samples rather than an SLA or capacity proof. Run heavy validation separately to avoid measuring test-runner contention.

## Historical measured baseline: `2a7e3d4`, 2026-10-15 (P01)

The reviewed `2a7e3d4` checkout was clean. The normal production build ran on Windows x64, Node 24.18.1, 12 logical CPUs, with local PostgreSQL 17 and exactly 10,000 active synthetic employees. Heavy validation commands were stopped during measurement. The raw aggregate JSON was removed from the maintained documentation at the user's request; the table below retains the reviewed aggregate values, and the original artifact remains available in [Git history at revision `0e1be8a`](https://github.com/akshaydubey50/comcentral/blob/0e1be8a7d2d6d6cc8bdf3ee25b3e8b52bdc57914/docs/evidence/benchmark-2026-10-15.json).

| Operation | First request (ms) | Warm p50 / p95 (ms) | Concurrency 2 p50 / p95 (ms) |
|---|---:|---:|---:|
| Directory, 25 rows | 76.53 | 39.67 / 66.15 | 49.21 / 81.43 |
| Complete native insights | 797.18 | 483.09 / 525.35 | 753.00 / 1080.71 |
| Complete 10,000-row CSV export | 726.29 | 481.07 / 512.62 | 522.67 / 919.76 |

All 63 measured read requests succeeded. The first export was parsed and verified to contain all 10,000 rows; list/report population checks also passed. Application-process peak RSS was **459.15 MiB**, with peak used heap **297.49 MiB**. The separate 10,000-row import preview took **459.58 ms** and atomic commit **6945.73 ms**, with persisted row count verified before owned-fixture cleanup. Its process peaked at **403.75 MiB RSS** / **233.45 MiB heap**. These are observed whole-process peaks, not a leak analysis or endpoint allocation profile.

## Proposed local regression budgets for this harness

These thresholds are proposed from this baseline, not thresholds established before measuring or a hosted SLA. They allow roughly twofold latency headroom for this developer machine while keeping directory interaction responsive and reports/imports within a short user wait. Re-evaluate against the actual hosting region, resource limits, data size and usage.

| Signal | Proposed budget | Baseline |
|---|---|---|
| Directory p95 | Warm <=250ms; concurrency 2 <=500ms | Within budget |
| Reports and export p95 | Warm <=1s; concurrency 2 <=2s | Within budget |
| 10,000-row import | Preview <=2s; commit <=15s | Within budget |
| Observed application RSS | <=768 MiB in either measured process | Within budget |
| Errors and result integrity | Zero failed requests; exact expected population and persisted import count | Passed |

**Decision:** retain the current export/report implementation for the approved 10,000-row release. P02 streaming export and P03 SQL aggregation remain conditional; these measurements do not establish a current bottleneck requiring either rewrite. Reopen them for larger accumulated populations, greater concurrency, hosted memory pressure or repeated budget failures. The import cap does not cap total stored employees.

This small run excludes provider cold starts, database network latency, browser rendering, sustained concurrency, long-running memory growth and live FX-provider timing. Ten samples per phase cannot establish a reliable tail-latency SLA. Final gate and deployment status remain in [validation.md](validation.md).
