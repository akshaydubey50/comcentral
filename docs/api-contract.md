# API contract v1

The TypeScript types in [`src/shared/contracts.ts`](../src/shared/contracts.ts) are the integration contract. This document explains their HTTP use. Money crosses the API as decimal strings, and current release/deployment status belongs only in [validation.md](validation.md).

## Transport, responses and errors

- Dates use `YYYY-MM-DD`; timestamps use ISO UTC strings.
- Successful JSON responses use `{data: ...}` unless an endpoint below states otherwise. Employee listing returns `EmployeePage` directly, session returns `{user: HrUser|null}`, and readiness returns its minimal status directly.
- CSV template/export endpoints return downloads rather than JSON.
- Application errors use `{error:{code,message,details?}}`. Validation uses `422 VALIDATION_ERROR`; other documented boundaries use 400, 401, 403, 404, 409, 413, 415, 422, 429, 500 or 503 as appropriate. Internal exceptions are sanitized.
- Better Auth endpoints retain Better Auth's native `{code,message}` errors. For example, an existing registration email returns native status 422 and code `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`.
- Every API response includes `X-Request-ID`. A caller-supplied UUID-shaped ID (RFC variant, versions 1-8) is retained; other or missing values are replaced. It is diagnostic context, never authorization.
- Structured `http_request` logs include timestamp, entry point, request ID, method, allowlisted route template, status and elapsed milliseconds. Query strings, employee IDs, bodies, cookies, credentials, connection strings and raw exception messages are excluded. Logging failure cannot replace the response.
- JSON mutations require `Content-Type: application/json` and an `Origin` equal to both the configured `BETTER_AUTH_URL` origin and the request origin. Application mutations read through the shared request helper default to 64 KiB; registration and imports use the explicit limits below. Other native Better Auth actions are handled by Better Auth after the same-origin/content-type check.

## Authentication and public exceptions

All employee, directory-option, import, reporting and manual FX-refresh endpoints require a valid HR database session. The exceptions are:

| Endpoint | Access |
| --- | --- |
| Better Auth under `/api/auth/*` | Public auth handler. POST actions still enforce same-origin JSON. Sign-up, sign-in and sign-out use Better Auth's native response/error contract. |
| `GET /api/session` | Public session probe returning `{user: HrUser|null}`. It exposes only user id, name and email. |
| `GET /api/ready` | Public minimal readiness result: `{status:"ready"}` (200) or `{status:"unavailable"}` (503). The database/configuration diagnosis is not returned. |
| `GET /api/cron/fx` | Scheduler access using `Authorization: Bearer <CRON_SECRET>`; it does not accept an HR session as a substitute. |

Public registration uses `POST /api/auth/sign-up/email` with exactly `{name,email,password}`. Name is trimmed and contains 1-160 characters. Email is trimmed, lowercased, valid and at most 254 characters. Password is preserved exactly and contains 5-128 characters; confirmation stays in the browser form and is not sent. The JSON body limit is 4 KiB, and additional fields are rejected.

A successful public sign-up writes the account/credential/session through Better Auth's transactional Prisma adapter, sets an HttpOnly, SameSite=Lax session cookie (`Secure` in production), and immediately grants the HR account access to the one shared workspace. Invitation, administrator approval and email verification do not gate this assessment flow. The frontend discards returned token data and confirms `GET /api/session` before entering the workspace. The optional administrative provisioning script creates credentials without a browser session and applies its own stricter 12–128-character `HR_PASSWORD` rule; this does not change the public 5–128-character registration contract.

Better Auth applies database-backed limits of 5 sign-up attempts per 15 minutes and 10 sign-in attempts per 15 minutes. It identifies unauthenticated clients through the supported ingress. The deployment assumes Vercel overwrites `X-Forwarded-For`; a custom proxy must do the same and prevent direct origin access. Direct public exposure of `next start` is not a verified topology. See [Vercel request headers](https://vercel.com/docs/headers/request-headers) and [Better Auth IP detection](https://better-auth.com/docs/concepts/rate-limit).

## Shared employee and money semantics

- `Employee.salary` is `string|null`. `null` means an imported employee is awaiting a first salary; it never means zero. A manual employee create still requires a positive salary string.
- Supplied salaries are positive plain decimal strings no greater than `999999999999.99`. JPY permits zero fractional digits; other supported currencies permit at most two.
- Supported currencies are USD, INR, EUR, GBP, JPY, CAD, AUD, SGD and BRL. Supported countries are AU, BR, CA, DE, FR, GB, IN, JP, SG and US. Country and salary currency are independent.
- Employment types are `FULL_TIME`, `PART_TIME`, `CONTRACT` and `INTERN`. Joining dates cannot be in the future.
- Employee code and normalized email are unique. Archive preserves the record and salary history; archived employees reject salary changes.
- Salary changes require the current positive `version`, exact salary/currency and a reason. The employee update and immutable history insert commit together. `SalaryHistory.previousSalary` is null only for a first assignment.

## Filters, pagination and reporting queries

`EmployeeFilters` accepts `q`, `country`, `department`, `jobRole`, `employmentType`, `status` and `salaryStatus`. Supplied filters combine with AND. Omitting `status` selects active employees; `status=ALL` includes active and archived records.

`salaryStatus=PENDING` selects `salary=null`; `salaryStatus=RECORDED` selects a supplied salary. Omitting it includes both. The same filter set applies before pagination/aggregation to employee listing, export and insights. Unsupported API values return validation errors; the browser normalizes unsupported URL values to its inclusive default.

Employee listing defaults to page 1, page size 25, `name` ascending; page size is 1-100. Supported sort fields are `name`, `employeeCode`, `joiningDate`, `salary` and `updatedAt`, with a stable ID tie-break.

Insights add `currencyMode=NATIVE|USD` (default `NATIVE`) and `groupBy=country|department|jobRole` (default `country`). They operate on the full filtered population, never the current directory page.

## Endpoints

| Method and path | Request | Successful response and behavior |
| --- | --- | --- |
| `GET /api/options` | HR session | `{data: DirectoryOptions}`. |
| `GET /api/employees` | `EmployeeQuery` in the query string | `EmployeePage` directly: `{data: Employee[], pagination:{page,pageSize,total,totalPages}}`. |
| `POST /api/employees` | `EmployeeInput` | `{data: Employee}`, 201. Manual create requires salary. |
| `GET /api/employees/:id` | HR session | `{data: Employee}`. |
| `PATCH /api/employees/:id` | `EmployeeUpdate` | `{data: Employee}`. Salary/currency are not writable here. |
| `DELETE /api/employees/:id` | `{version}` | `{data: Employee}` after setting status to `ARCHIVED`. This is an archive operation, not physical deletion. |
| `POST /api/employees/:id/archive` | `{version,archived:boolean}` | `{data: Employee}` after archive (`true`) or restore (`false`). |
| `POST /api/employees/:id/salary` | `SalaryChangeInput` | `{data: Employee}` after atomic salary/history change; stale version returns 409. |
| `GET /api/employees/:id/history` | HR session | `{data: SalaryHistory[]}`, newest first. |
| `GET /api/employees/export` | `EmployeeFilters` | Complete matching population as native-amount CSV with documented stable ordering and spreadsheet-formula protection. Pending salaries are empty cells. |
| `GET /api/imports/template` | HR session | Canonical CSV header download. |
| `POST /api/imports/preview` | `{csvText}` | `{data: ImportPreview}`. Parses/validates without writes. |
| `POST /api/imports/commit` | `{csvText,previewHash,confirmed:true}` | `{data: ImportResult}`, 201. Rehashes, reparses and revalidates before one atomic insert. |
| `GET /api/insights` | `InsightsQuery` | `{data: Insights}` over all filtered employees. |
| `POST /api/fx/refresh` | Strict empty object `{}` | `{data: FxStatus}` after an authenticated same-origin provider refresh attempt. |
| `GET /api/cron/fx` | Cron bearer secret | `{data: FxStatus}` after the protected scheduled refresh attempt. |

## CSV import contract

Decoded CSV is limited to 2 MiB and 10,000 data rows. The JSON request envelope is limited to 4 MiB plus 1 KiB. Preview returns at most 20 rows and 100 error objects while preserving the full `errorCount`.

Every field except salary is required exactly once, in any order. Canonical headers use `EmployeeInput` names. Accepted aliases are `id -> employeeCode`, `fullName -> name`, `jobTitle -> jobRole` and `hireDate -> joiningDate`. Header spelling is case-sensitive. Unknown columns, missing required columns, duplicate canonical/alias combinations, incorrect row widths, duplicate codes/emails within the file or database, and invalid supplied amounts are rejected.

Omitted or blank salary becomes null; it is never invented. A supplied salary uses the normal currency precision/range rules. Preview exposes nullable salaries, `salaryPendingCount`, a SHA-256 `previewHash`, validity/error totals and bounded preview rows. Commit requires the same text/hash plus `confirmed:true`; it verifies the unchanged hash and all current database constraints, then inserts the entire batch or none. Imports never overwrite existing employees or salaries.

## Reporting and FX semantics

`Insights.headcount` includes salary-pending employees, and `salaryPendingCount` reports them separately. Pay summaries, groups, bands, tenure pay statistics and outlier cohorts exclude pending salaries. The pending count remains visible when USD conversion is unavailable.

Native reporting separates currencies. Approximate USD reporting uses a complete validated dated provider snapshot and never changes native salaries. Missing or over-age rates make converted reporting unavailable rather than applying a fallback. An immutable legacy snapshot without BRL remains historical evidence but cannot supply current USD reporting.

Outliers compare country/currency/job-role/employment-type cohorts and return evaluated, insufficient-data or zero-IQR states with the cohort size and configured minimum. They are descriptive review signals, not automatic pay or employment decisions.

## Authenticated request limits

Expensive requests use independent PostgreSQL-backed fixed windows keyed by verified HR user and the database clock:

| Scope | Limit |
| --- | --- |
| Import preview and commit combined | 6 requests per 60 seconds |
| Insights | 30 requests per 60 seconds |
| Employee CSV export | 6 requests per 60 seconds |

A maximum-size import counts once at preview and once at commit. Rejected work stops before body parsing or expensive service execution where applicable and returns `429 {error:{code:"RATE_LIMITED",message:"Too many requests. Try again later."}}` with `Retry-After`. Denied requests neither extend the fixed window nor grow its counter indefinitely. These limits bound admitted request volume; they do not cap total in-flight concurrency or public account creation.
