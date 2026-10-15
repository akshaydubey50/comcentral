# ACME Employee Salary Management

**One-page requirements | Status: core built; audit delivery in progress | Primary user: HR Manager**

## Goal
Replace spreadsheets for 10,000 employees across countries with accurate salary records and clear pay reporting by country, department, role, and tenure.

## First-release scope
- **Registration and access:** Provide a public Create account page linked from login, collecting name, work email, password, and password confirmation. Successful registration creates an HR account, signs the user in, and immediately opens the shared HR workspace. No invitation, administrator approval, or email-verification gate. All HR accounts have the same access to the existing organization's employee and salary records. Validate required fields, email, matching passwords, and the password policy; reject duplicate emails without overwriting accounts. Support login/logout and authorize all protected operations server-side.
- **Employee directory:** Create, view, edit, search, filter, sort, archive/restore, and paginate employees server-side. Store unique code, name, work email, country, department, job role, employment type, joining date, status, annual salary, and currency. Archiving preserves history.
- **CSV migration:** Validate and preview up to 10,000 rows/2 MiB with reordered columns and documented id/name/role/date aliases. Save missing salaries as pending, never zero; support France, Brazil/BRL and interns. Reject invalid fields and duplicates; revalidate and save the entire batch or none. Export matching records with formula protection.
- **Compensation:** Manage annual gross contractual base pay using exact decimals and currency precision. HR can add an imported employee's first salary. Every assignment/change requires a reason and atomically records before/after values, actor and timestamp. Reject stale edits; preserve salary history.
- **Pay summaries:** Show headcount, pending-salary count, total, minimum, maximum, average, median, P25 and P75 by country, department and role. Pending employees count toward headcount but not pay statistics. Default to active employees and separate currencies; label filters and annualized commitments.
- **Bands and tenure:** Show salary-distribution ranges with employee counts, plus headcount and average/median pay by tenure bucket. Derive tenure from joining date and a visible reporting date; publish bucket boundaries.
- **Outlier review:** Flag salaries within country, native currency, role, and employment-type groups using a documented interquartile-range rule. Show group size and method; withhold flags for insufficient data or zero spread. Flags support HR review, without automatic salary decisions.
- **USD reporting:** Offer an approximate USD view using automatically fetched daily provider rates, stored as dated snapshots. Display source, rate date, and refresh status; preserve native salaries. Missing or over-age rates make converted totals unavailable; provider failures show explicit fallback status.
- **Usability:** Provide mobile employee cards, accessible charts with exact-data tables, keyboard navigation, password visibility controls, and a public introduction linked to login and registration. Preserve dashboard URLs and filter behavior.

## Deliberate exclusions
- Payroll payments, tax, deductions, bonuses, and hourly compensation: require separate payroll and country-specific rules.
- Pay-equity judgments and historical organization-wide analytics: need additional evidence and models.
- Multiple organizations, extra permission roles, approval chains, and scheduled/backdated changes: exceed the initial HR workflow.
- Arbitrary Excel parsing and bulk salary updates through import: require additional mapping and overwrite policies.

## Acceptance and quality
New users can register and immediately enter the HR dashboard; invalid or duplicate submissions create no account or authenticated session. Cover registration success, validation, duplicate-email handling, login/logout, and protected-route access in deterministic tests and browser journeys. HR can import, find, update, inspect history, and verify reports/exports. Invalid imports save nothing. Provide database transaction/constraint tests and cover calculations, analytics boundaries, stale edits, and FX failures. Supply a repeatable seed script for exactly 10,000 synthetic employees across countries; measure directory/report performance. Persist data across redeployments; provide accessible loading, empty, and error states.

## Delivery
Deliver deployed React/Next.js UI, Node.js backend, relational database, and daily rate refresh, targeting verified free-tier eligibility/limits. Include setup/access instructions, demo video, incremental commits, this brief, architecture/trade-offs, tests, and evidence of AI contributions and corrections. Record readiness, request diagnostics, workload measurements and recovery limits. Author independently, using PayScope only as reference. PROJECT_SPEC.md expands acceptance criteria.
