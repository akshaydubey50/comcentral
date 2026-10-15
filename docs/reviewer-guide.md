# Reviewing ComCentral

ComCentral is an independently built HR salary workspace. PayScope was a reference for comparison, not a source-code template. The audit led to a tracked improvement plan, not an automatic copy of its architecture or feature set.

## A short reading path

1. Read the [one-page requirements](requirements.md) for the user problem and exclusions, then [PROJECT_SPEC.md](../PROJECT_SPEC.md) for acceptance boundaries.
2. Read [architecture.md](architecture.md) for same-origin deployment, exact money, atomic salary history, CSV confirmation and dated FX decisions.
3. Inspect [tasks/todo.md](../tasks/todo.md) and [validation.md](validation.md) to distinguish implemented code, pending acceptance work and executed evidence.
4. Read [ai-use.md](ai-use.md) for actual AI contributions, corrections and known limits. Use the task/commit references to inspect the resulting changes.
5. Run the application using [README.md](../README.md); follow [the demo script](demo-script.md) and compare the observed behavior with the claims.

## Behaviors worth examining

| Behavior | Why it matters | Starting point |
|---|---|---|
| Salary version and history | Prevents a stale editor from silently overwriting pay; preserves the explanation and actor | [Employee service](../src/server/services/employees.ts), [salary dialog](../src/components/employees/salary-change-dialog.tsx) |
| CSV preview and atomic commit | A preview is not permission to trust old uniqueness checks or changed file contents | [Import service](../src/server/services/imports.ts), [CSV UI](../src/components/imports/csv-import-workflow.tsx) |
| Native versus converted pay | Approximate reporting must not mutate authoritative employee salaries | [Analytics rules](analytics-rules.md), [FX service](../src/server/services/fx.ts) |
| Registration transaction/session | A created account and a confirmed authenticated browser are different outcomes | [Registration contract](registration-handoff.md), [registration tests](../tests/integration/registration.integration.test.ts) |
| Isolated test targets | A destructive test helper must reject application data before doing work | [Database guard](../tests/integration/test-database.ts), [browser guard](../tests/e2e/test-target.ts) |

## What the AI record demonstrates

The record should let a reviewer follow a concrete chain: user outcome, bounded task, generated proposal/change, review correction, executed check, and resulting commit. Examples already recorded include preserving an opening salary version, a CSV file-reading race, a stale production server serving a missing registration route, and a reference-review finding corrected after the coordinator located a database constraint.

These are documented examples, not claims that AI output is automatically correct. Some evidence came from mocked browser fixtures, some from real isolated databases, and some is historical. Their limits are stated in the validation ledger. Test counts measure discovered cases, not completeness or production readiness.

## Questions the implementation should answer

- Which decision protects salary history when two users edit at once?
- What happens if a CSV preview is valid but another user inserts a duplicate before confirmation?
- What information disappears when FX data is too old, and which native values remain available?
- Which checks use real persistence, and which only exercise the UI contract?
- Which audit suggestions were rejected or deferred, and why?

The intended evidence is in the code, tests, decision log and Git history. No secret, real employee record or public demo credential is needed to assess those choices.
