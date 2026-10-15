# Reproducible workload measurements

P01 measures the approved 10,000-employee dataset before considering SQL aggregation or streaming export. This script is a local test tool. It refuses remote databases, missing acknowledgments, application targets and reused import/benchmark targets. It emits aggregate timings and memory, never employee rows, credentials, cookies or connection URLs.

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

Actual measurements, proposed acceptance budgets and any decision to activate P02/P03 will be recorded in [validation.md](validation.md) after execution. Do not present the existence of this runner as a completed performance result.
