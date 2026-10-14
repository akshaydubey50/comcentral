# ComCentral implementation plan

Updated 2026-10-14 after the PayScope audit. The user has authorized implementation of the audit, incremental commits and continuing routine work unattended. The independent backend session has stopped; this coordinator now assigns both frontend and backend work with separate file ownership. Unfinished backend work remains in this plan.

Scope, architecture decisions, the audit coverage matrix and milestones are in [the delivery plan](../docs/implementation-plan.md). The executable task list is [todo.md](todo.md). Current run results are in [validation.md](../docs/validation.md).

## Current state

Registration and automatic shared-workspace access are implemented. The approved password policy is 5-128 characters; the older 12-character planning statement is superseded. The auth transaction and test-target guards have implementation and recorded isolated evidence. The former browser login locator issue was reproduced and fixed. Do not rebuild these tasks from the original proposal.

The latest full unit run passed 124 tests and timed out in one salary-dialog case; its five focused tests passed. Password/browser fixtures do not replace a real database journey at the current five-character boundary. Deployment, live FX scheduling and measured workload/recovery evidence remain pending.

## First assignments

1. Frontend: F01, then F02 and reporting visuals F03-F05. Preserve business behavior and existing routes/contracts.
2. Backend: continue B01-B05 from the invariant/seed backlog, then B06/B07. Run B05 first if seeding is imminent.
3. Coordinator: V01, contract coordination, operational integration S02/S03 and final V02/D01-D05.
4. Independent reviewers: inspect bounded completed slices; no overlapping writers or nested delegation.

## Preservation of the previous backend plan

| Previous item | Current treatment |
|---|---|
| 1: registration contract | Implemented baseline; C01/V01 keep documentation and current integration aligned |
| 2: isolated test selection | Guards exist; retain them in every database/browser task and V02 |
| 3: public signup and immediate session | Implemented baseline; V01 verifies current policy, S01 verifies lifecycle boundaries |
| 4: registration failures/rollback | Prior evidence retained in validation.md; V01 reruns relevant current integration |
| 5: real browser checkpoint | Former login locator fixed; V01/V02 close the current combined snapshot |
| 6: CSV/employee database behavior | Preserved as B01/B02 |
| 7: analytics/FX persistence | Preserved as B03/B04 and live delivery D02 |
| 8: safe seed and workload | Preserved as B05/P01; conditional optimizations P02/P03 depend on evidence |

## Decisions retained

Keep Next.js, MUI, Prisma and Better Auth; decimal API values; atomic immutable salary history; explicit stale-edit recovery; archive/restore; create-only CSV import; native-currency reports; dated FX without silent fallback. Keep immediate-access registration and the single shared HR workspace. Viewer roles, tenants, recovery/MFA and a landing-page route are separately identified future decisions.

The checklist distinguishes required work, recommended UI/operational improvements and optional/conditional work. It records status without claiming that planned functionality is implemented. Use the ownership rules and completion gates in the delivery plan for each assignment.
