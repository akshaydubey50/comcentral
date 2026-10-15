# Reviewing ComCentral

ComCentral is an independently built HR workspace for annual contractual base pay. Requirements describe intended behavior; code and tests provide implementation evidence; [validation.md](validation.md) is the only current execution ledger. A local check, a deployed check and a historical snapshot are different claims.

## Five-minute reading path

1. Read the [one-page requirements](requirements.md) for the user problem and exclusions, then [PROJECT_SPEC.md](../PROJECT_SPEC.md) for detailed acceptance boundaries.
2. Read [architecture.md](architecture.md) for system boundaries, access, salary history, import transactions, routing, security and rejected alternatives.
3. Use [analytics-rules.md](analytics-rules.md) and the [API contract](api-contract.md) to check exact money, pending-salary, FX, filter and error semantics.
4. Compare [tasks/todo.md](../tasks/todo.md) with [validation.md](validation.md) to distinguish approved, implemented, locally verified and deployed states.
5. Read [ai-use.md](ai-use.md) for AI contributions, corrections and uncertainty. Use its task and commit references to inspect the resulting changes; consult the [documentation history](archive/2026-10-15-documentation-history.md) only for superseded context.

## Implementation entry points

Paths are listed without claims about their current verification state. Follow the contracts and validation ledger when assessing them.

| Behavior | Why it matters | Starting paths |
|---|---|---|
| Registration and session confirmation | Account creation and a usable authenticated browser session are separate outcomes | `src/server/auth.ts`, `src/app/api/auth/[...all]/route.ts`, `src/app/api/session/route.ts` |
| Salary version and history | Rejects stale pay edits and preserves reason, actor and before/after values | `src/server/services/employees.ts`, `src/components/employees/salary-change-dialog.tsx` |
| CSV preview and atomic commit | Revalidates changed content and uniqueness before an all-or-none write | `src/server/domain/csv.ts`, `src/server/services/imports.ts`, `src/components/imports/csv-import-workflow.tsx` |
| Reporting and outliers | Keeps exact Decimal calculations and peer-group rules outside presentation code | `src/server/domain/analytics.ts`, `src/server/services/insights.ts` |
| Native and approximate-USD pay | Uses immutable dated rates without changing authoritative salaries or inventing fallback totals | `src/server/domain/fx.ts`, `src/server/services/fx.ts` |
| Request and target safety | Correlates redacted failures and prevents destructive checks from using an application database | `src/server/request-logging.ts`, `tests/integration/test-database.ts`, `src/server/domain/seed-target.ts` |

The [CSV guide](csv-data-guide.md) provides a portable operator path and the exact header, alias and value contract.

## Evidence and AI-use boundary

The AI record should support a traceable chain: user outcome, bounded task, AI proposal or change, reviewer correction, executed check and resulting commit. Recorded examples include preserving an opening salary version, correcting a CSV file-reading race, identifying a stale production process serving an older route, and revising a reference-review conclusion after locating a database constraint.

These examples do not imply that generated output is correct. Browser fixtures, isolated PostgreSQL checks, production-build browser checks and deployed HTTPS checks establish different facts. Test counts show discovered cases, not completeness. Read [validation.md](validation.md) for dates, revisions, environments, failures and remaining work instead of inferring current readiness from a code path or old result.

Current release readiness and hosted observations belong in [validation.md](validation.md); the temporary [Vercel deployment handoff](vercel-deployment-checklist.md) records owner-specific deployment work and cleanup. A completed demo video is still pending. Judge any hosted behavior by its recorded revision and environment rather than treating the walkthrough plan as acceptance evidence.

## Compact demo scenario

This compact scenario supports a quick reviewer conversation. For the recording, follow the detailed six-minute assessment walkthrough (`docs/demo-walkthrough-6min.md`; active owner handoff), rehearse it against the revision and environment identified in the validation ledger, and keep the walkthrough focused on observable behavior.

| Scenario | Show | Expected behavior |
|---|---|---|
| Public access | Open anonymous `/`, select Create account, use a synthetic identity and submit once | Registration requires no invitation, approval or email-verification gate; the browser confirms the session before opening the shared HR workspace |
| Directory and salary evidence | Filter and search employees, change page/sort, export matches, then change one salary with a reason; use a second tab for a stale edit if time permits | Applied filters remain visible, export matches the population, the salary history records before/after evidence, and the stale write is rejected |
| CSV migration | Download the template, preview one invalid synthetic file, then correct and confirm it | Row errors are visible, the invalid batch saves nothing, and the reviewed valid batch is imported atomically; blank salary remains pending |
| Reporting | Show native headcount, pending count, pay summaries, bands, tenure and outlier evidence with exact-data tables | Pending employees count toward headcount but not pay calculations; currencies remain separated and reporting definitions are visible |
| Approximate USD | Switch modes and identify provider, rate date and freshness | A complete usable snapshot enables conversion without changing native salary; missing, stale or incomplete rates make converted totals unavailable rather than applying a fallback |
| Delivery evidence | Open the validation and AI-use records and identify the reviewed revision and known limits | Claims match the recorded environment; local results are not presented as deployed proof |

Use only labelled synthetic employees and a dedicated demo/test database. The walkthrough includes optional invalid (`docs/demo-assets/invalid-employees.csv`; active owner handoff) and valid (`docs/demo-assets/valid-employees.csv`; active owner handoff) sample imports; replace their run identifiers together before any committed rehearsal so unique codes and emails are not reused. Keep credentials masked; never show environment files, connection strings, provider consoles, private reviewer instructions or real employee data. Close developer tools and notifications before recording. If deployed FX or another required behavior is unavailable, show the explicit unavailable state and describe the pending evidence instead of staging a success claim.

## Questions the implementation should answer

- Which transaction and version check protect salary history when two users edit at once?
- What happens when a CSV preview is valid but the file or database changes before confirmation?
- Which values remain available when FX data is missing, incomplete or too old?
- Which checks use intercepted responses, real persistence, a built application or a deployed service?
- Which alternatives were rejected, and which capabilities still require product approval?

The intended evidence is in the implementation, contracts, decision record, validation ledger and Git history. No secret, real employee record or public demo credential is needed for review.
