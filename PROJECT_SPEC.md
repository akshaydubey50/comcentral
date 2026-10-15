# ComCentral product and engineering specification

This document expands the approved [one-page requirements](docs/requirements.md) into reviewable acceptance criteria. The [task checklist](tasks/todo.md) records implementation progress; [validation.md](docs/validation.md) records execution evidence. A requirement in this file is not a claim that its implementation or deployment is complete.

## Product and users

ComCentral replaces salary spreadsheets for an HR manager working with 10,000 employees across countries. It manages current annual contractual base pay, explains the matching population and preserves the evidence behind salary changes. It is not a payroll, tax or pay-equity decision system.

The current product has one shared organization and one HR access level. Public registration creates an account and session with immediate access. This is an explicit assessment access model, not proof of organization membership. Use labelled synthetic records for a public demonstration; confidential multi-company operation requires a separately approved membership/isolation design.

## Requirements and acceptance

| ID | User outcome | Acceptance boundary | Audit tasks |
|---|---|---|---|
| FR-01 | Register, sign in and sign out | Name/work email/password/confirmation; normalized identity, raw 5-128-character password, independent reveal controls; duplicate/invalid writes create no partial account; confirm the session before entering the workspace | V01, S01 |
| FR-02 | Find and maintain employees | Server pagination and stable sorting; URL-backed search/filters; create/edit/detail; archive/restore; unique employee code and email; salary changes use their dedicated flow | B02, F02, F07 |
| FR-03 | Change salary with evidence | Exact amount/currency; reason, actor, timestamp and before/after history in one transaction; immutable history; reject archived/stale edits; preserve drafts until an explicit reload | F01, B02 |
| FR-04 | Migrate a spreadsheet safely | Exact CSV template, row errors, 2 MiB/10,000-row limits, preview of inspected contents; revalidate at confirmation; duplicates/races/late failures save none; no salary overwrite through import | B01, F08 |
| FR-05 | Export the matching directory | All matching rows, documented ordering and native amounts; exact decimal strings; spreadsheet-formula protection; failures are observable | B02, P02 |
| FR-06 | Understand current pay commitments | Full filtered population; headcount, total, min/max, mean, median, P25/P75; country/department/role grouping; currencies separated by default | B04, F03, F04 |
| FR-07 | Explore distribution and tenure | Label salary bands as descriptive ranges; completed calendar years and visible reporting date; headcount/mean/median per bucket; equivalent accessible tables | B04, F04, F05 |
| FR-08 | Review potential outliers | Country/currency/role/employment-type cohorts; explicit minimum-size and zero-IQR states; show method and group size; no automatic employment/pay decisions | B04, F06 |
| FR-09 | View approximate USD reporting | Daily provider rates, immutable dated snapshots, verified stored content, source/freshness/failure visibility; missing/over-age rates make converted totals unavailable; native pay never changes | B03, D02 |
| FR-10 | Use the app on phones and keyboards | Mobile employee cards, readable charts with exact-data alternatives, labelled inputs, focus management, 44px touch targets and usable loading/empty/error/recovery states | F02-F06 |
| FR-11 | Understand the product before signing in | A concise public introduction with working login/register links; preserve existing dashboard/deep-link routes and accurately describe implemented capabilities | F09 |

Search refinement and the public introduction are presentation improvements approved in the audit implementation request. They must preserve existing links and filter semantics. Select a separate public welcome route rather than moving the dashboard without a product reason.

## Engineering requirements

| ID | Requirement | Evidence |
|---|---|---|
| ER-01 | Keep Next.js App Router, TypeScript, MUI, PostgreSQL/Prisma 7 and Better Auth | Lockfile, architecture record and reproducible build |
| ER-02 | Money crosses APIs as decimal strings; SQL/runtime constraints protect supported precision and positive amounts | Domain and database boundary cases |
| ER-03 | Authorization is enforced on the server; mutation origins/content/body limits and revocable sessions remain effective | Allowed/denied API, expiry and logout cases |
| ER-04 | Logs are structured and correlated, without credentials or employee/salary payloads | Request-ID and redaction/failure tests |
| ER-05 | Built-app readiness, browser policy and request resource limits are compatible with the deployed architecture | Production-start, header/browser and limit checks |
| ER-06 | Database tests, seeding and benchmarks cannot target the running application database | Offline guard cases and isolated execution evidence |
| ER-07 | Reproduce exactly 10,000 synthetic employees and measure the intended workload | Seed counts, cold/warm/concurrent timings, memory/error rates and stated environment |
| ER-08 | Quality commands run actual checks with no skipped acceptance assertions or false E2E success | Unit/type/lint/build/integration/browser discovery and results for the reviewed revision |
| ER-09 | Application data survives deployment; the scheduled FX path actually executes | Deployed persistence and scheduled-invocation evidence |
| ER-10 | Operational limits, alerts, backups and recovery expectations are explicit | Runbook and measured demo restore/notification evidence |

Do not invent performance guarantees before measuring a baseline. Streaming exports and SQL aggregation are conditional on measured workload/resource needs and must preserve the established results.

## Architecture boundaries

Browser pages compose feature components. TanStack Query owns server state, URL parameters own navigation/filter state, and local form state owns drafts. The typed API client handles the shared response/error contract. Server Route Handlers enforce the request/session boundary; services coordinate transactions; domain functions perform deterministic money, CSV, tenure, analytics and FX calculations. PostgreSQL constraints and triggers complement application checks.

Keep the UI/API same-origin and independently test the important boundaries. A repository class, state store or new package is introduced only when it solves a demonstrated responsibility or duplication problem. Decisions and rejected alternatives belong in [architecture.md](docs/architecture.md).

## Scope decisions retained

The current release excludes additional roles/tenants, approval chains, scheduled/backdated pay changes, recovery/MFA administration, hourly pay, payroll/tax execution, arbitrary Excel parsing and bulk salary overwrites. U01-U03 are decision tasks for a later product, not authorization to silently redesign current account access. The audit's reference features are compared in [payscope-comparison.md](docs/payscope-comparison.md).

## Delivery and evidence

Use [implementation-plan.md](docs/implementation-plan.md) for ordering and [tasks/todo.md](tasks/todo.md) for ownership/acceptance. Implement a bounded slice, run its meaningful checks, review the diff, record the result and create a descriptive incremental commit. Run the required integrated checks before a release candidate. Generated documentation does not substitute for successful execution.

Keep one current evidence ledger; historical results retain their date/snapshot limitations. Record the deployed URL/commit, current limitations and the demo video. Follow [deployment.md](docs/deployment.md) for database separation, migrations, secrets and rollback.

## AI-assisted development

AI is used for bounded implementation, source investigation and independent reviews. Product choices remain traceable to the user's requirements. Each substantive entry in [ai-use.md](docs/ai-use.md) records the request, proposal, corrections, checks and remaining uncertainty. Exact prompts are identified only when retained; retrospective descriptions are labelled as summaries. Never claim unmeasured time/cost savings, human verification that did not occur, or a test run that was only proposed.

Start a review with [the reviewer guide](docs/reviewer-guide.md). Agent entry points are [AGENTS.md](AGENTS.md) and the short [CLAUDE.md](CLAUDE.md) pointer; durable instructions are maintained once.
