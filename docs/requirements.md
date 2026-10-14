# ACME Employee Salary Management

**One-page requirements | Status: implementation baseline | Primary user: HR Manager**

## Goal
Replace spreadsheets for 10,000 employees across countries with accurate salary records and clear pay reporting by country, department, role, and tenure.

## First-release scope
- **Access and directory:** Provision HR accounts; authorize all protected operations. Create, view, edit, search, filter, sort, archive/restore, and paginate employees server-side. Store unique code, name, work email, country, department, job role, employment type, joining date, status, annual salary, and currency. Archiving preserves history.
- **CSV migration:** Provide a fixed template, preview, row errors, and field/currency/amount validation. Reject duplicate employee codes within the file or database. Revalidate on confirmation; create the entire batch or none, without overwriting employees. Export all matching records with filters respected and spreadsheet-formula protection.
- **Compensation:** Manage salaried employees' annual gross contractual base pay using exact decimals and currency precision. Every salary/currency change applies immediately, requires a reason, and records before/after values, actor, and timestamp atomically. Reject stale edits and provide employee salary history.
- **Pay summaries:** Show headcount, annual base-pay total, minimum, maximum, average, median, P25, and P75 across all matches by country, department, and role. Default to active employees and separate currencies. Clearly label filters and current annualized commitments.
- **Bands and tenure:** Show salary-distribution ranges with employee counts, plus headcount and average/median pay by tenure bucket. Derive tenure from joining date and a visible reporting date; publish bucket boundaries.
- **Outlier review:** Flag salaries within country, native currency, role, and employment-type groups using a documented interquartile-range rule. Show group size and method; withhold flags for insufficient data or zero spread. Flags support HR review, without automatic salary decisions.
- **USD reporting:** Offer an approximate USD view using automatically fetched daily provider rates, stored as dated snapshots. Display source, rate date, and refresh status; preserve native salaries. Missing or over-age rates make converted totals unavailable; provider failures show explicit fallback status.

## Deliberate exclusions
- Payroll payments, tax, deductions, bonuses, and hourly compensation: require separate payroll and country-specific rules.
- Pay-equity judgments and historical organization-wide analytics: need additional evidence and models.
- Multiple organizations, extra permission roles, public registration, approval chains, and scheduled/backdated changes: exceed the initial HR workflow.
- Arbitrary Excel parsing and bulk salary updates through import: require additional mapping and overwrite policies.

## Acceptance and quality
HR can import, find, update, inspect history, and verify reports/exports. Invalid imports save nothing. Provide fast deterministic unit tests, database transaction/constraint tests, and browser journey tests covering authorization, calculations, analytics boundaries, stale edits, and FX failures. Supply a repeatable seed script for exactly 10,000 synthetic employees across countries; measure directory/report performance. Persist data across redeployments; provide accessible loading, empty, and error states.

## Delivery
Deliver deployed React/Next.js UI, Node.js backend, relational database, and daily rate refresh, targeting verified free-tier eligibility/limits. Include setup/access instructions, demo video, incremental commits, this brief, architecture/trade-offs, tests, and AI-use records. Author the solution independently, using PayScope only as reference.
