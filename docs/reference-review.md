# PayScope reference review

**Status:** Reference analysis for an independent implementation, started with user authorization on 14 October 2026.

## Evidence and boundary
The user supplied the employer's original assessment and identified https://github.com/meganathan-tech24/PayScope as a reference, explicitly requesting an independent implementation. On 14 October 2026, the user exported its description and README using GitHub CLI. This review covers that README snapshot only. No source code, test executions, deployed behavior, linked design documents, or commit history have been inspected. The snapshot is not pinned to a commit.

The employer's brief determines mandatory requirements. README checkboxes and performance statements describe the reference author's claims; they are not verification evidence for our application.

## Findings and proposed responses

| Reference README observation | Implication for our design |
| --- | --- |
| Employee management, server-side filtering/pagination, filtered CSV export, and grouped insights are described. | These are useful workflows to evaluate against the HR persona. Write our own acceptance criteria and implementation. |
| Frontend uses React/Vite on Vercel; Express API deployment instructions target Render. | This reference does not demonstrate that its complete backend runs on Vercel. Our proposed Next.js/Node.js APIs plus external PostgreSQL need their own early deployment test. |
| Salaries use integer minor units; aggregates stay within currencies by default. | Preserve explicit currency boundaries. Our proposed exact-decimal representation is a separate choice; both approaches require currency precision and rounding rules. |
| Optional USD normalization, tenure reports, salary bands, and statistical outliers are described. | The user promoted all four into first-release scope. Implement dated USD reporting with automatic daily rates, tenure, distribution bands and comparable-group outliers; document exact calculations. |
| HR and Viewer roles have different data visibility, including CSV and salary sorting. | This illustrates that permissions must cover every response path. Our proposed initial persona is provisioned HR only; additional roles need explicit disclosure requirements. |
| Anyone may register as HR_MANAGER; the README calls this an assessment simplification. | Provision HR accounts through a controlled setup process. Public selection of salary-access privileges would undermine our access model. |
| Logout discards a stateless JWT; server revocation is a future step. | The proposed Better Auth database-session approach should verify expiry, server-side logout, and authorization independently. |
| Application logs are written asynchronously with a fallback. | Operational diagnostics and compensation audit records serve different purposes. Required salary history must commit atomically with the salary update. |
| The seed command replaces all employees. | Keep our seed operation confined to a documented demo/test dataset and make reruns predictable without replacing unrelated records. |
| OpenAPI documentation, Playwright E2E, and the full GitHub Actions pipeline have unchecked checklist entries; the E2E script says tests are pending. | Treat these as unfinished according to the README, without claiming the source has no such files. Require execution evidence for our own checks before calling them complete. |

## Our independent product emphasis
The proposed workflow centers on a reliable employee directory, explicit annual-base-salary semantics, immediate changes with reasons and history, archival/restoration, and trustworthy reports. On 14 October 2026, the user confirmed that validated, fixed-template CSV import belongs in the first release because it addresses the transition from spreadsheets. The requirements draft now includes preview, row-level validation, duplicate detection, and all-or-nothing creation without overwriting existing employees. Requirements, UI, data model, implementation, tests, and explanations will be authored for this project.

The current deployment proposal is Next.js/React/TypeScript with Node.js Route Handlers on Vercel, Prisma, and PostgreSQL hosted on Neon. Material UI and Better Auth are proposed supporting libraries. Provider eligibility, quotas, package compatibility, and application behavior require project-specific validation. No deployment has been performed.

## Scope decisions
- Annual gross contractual base pay for salaried employees is the implementation baseline.
- The user confirmed validated CSV import and automatic daily provider FX; expanded summaries, tenure, bands and outlier review are now included.

## Delivery details still to establish
- Confirm whether the employer expects any backend technology beyond the permitted choices in the brief.
- Establish the remaining submission time and a hosting plan that meets the user's free-tier constraint.

## Implementation
See [requirements](requirements.md), [shared API contract](api-contract.md), [analytics definitions](analytics-rules.md), and [delivery plan](implementation-plan.md). Separate frontend and backend workers implement the agreed contract while the coordinator integrates and verifies. An authenticated deployed read/write check remains required; local implementation must not be described as deployed.
