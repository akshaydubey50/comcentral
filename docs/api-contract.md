# API contract v1

Types: src/shared/contracts.ts. JSON decimal strings for money; dates YYYY-MM-DD and timestamps ISO UTC. Responses use {data: ...} unless otherwise specified. All employee, directory-options, import, and reporting endpoints require a valid HR session; GET /api/session returns {user: HrUser|null}. Better Auth uses POST /api/auth/sign-in/email and /sign-out. Mutations verify request origin; JSON only. Errors {error:{code,message,details?}}, with 401/403/404/409/422 as appropriate. Never expose internal errors.

Public registration: `POST /api/auth/sign-up/email` accepts exactly `{name,email,password}` as same-origin JSON, limited to 4 KiB. Name is trimmed and must contain 1-160 characters. Email is trimmed, lowercased, valid and at most 254 characters. Password is preserved exactly and must contain 5-128 characters. Confirmation stays in the form; additional fields are rejected. A successful native Better Auth response sets an HttpOnly, SameSite=Lax cookie (Secure in production). The frontend discards returned token data and confirms `GET /api/session` before entering the dashboard. Every HR account immediately accesses the shared workspace without invitation, administrator approval, or email verification.

Signup writes the user, credential and session in one database transaction. Validation errors use the normal `422 VALIDATION_ERROR` envelope; malformed JSON returns 400, oversized bodies 413, invalid origins 403 and non-JSON requests 415. Existing emails return Better Auth's native `422` body `{code:"USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",message:...}` without changing the account. Signup is limited to 5 requests per IP per 15 minutes; excess requests return 429 with `X-Retry-After` seconds. Native auth errors use `{code,message}`; the frontend handles both error formats. Administrative provisioning continues to create credentials without creating a session. No shared API type changes were needed.

IP throttling assumes the supported Vercel ingress overwrites `X-Forwarded-For`. A custom reverse proxy must overwrite client-supplied forwarding headers and prevent direct access to the origin. Direct exposure of `next start` is not a verified production topology. See [Vercel request headers](https://vercel.com/docs/headers/request-headers) and [Better Auth IP detection](https://better-auth.com/docs/concepts/rate-limit).

- GET /api/options -> {data: DirectoryOptions}.
- GET /api/employees with EmployeeQuery -> EmployeePage. Default active, page1, size25, name asc. pageSize max100. All sorting has stable ID tie-break.
- POST /api/employees EmployeeInput -> {data: Employee}, 201.
- GET /api/employees/:id -> {data: Employee}. PATCH same path EmployeeUpdate -> {data: Employee}; salary/currency not writable here.
- POST /api/employees/:id/salary SalaryChangeInput -> {data: Employee}. Reason required; transaction updates salary and creates immutable history. Version conflict409.
- POST /api/employees/:id/archive {version,archived:boolean} -> {data: Employee}.
- GET /api/employees/:id/history -> {data: SalaryHistory[]}, newest first.
- GET /api/employees/export same EmployeeFilters, all matches as downloadable CSV (native amounts).
- GET /api/imports/template -> CSV template. Columns are EmployeeInput field names in declaration order.
- POST /api/imports/preview {csvText:string} -> {data: ImportPreview}. Decoded CSV max 2 MiB and 10,000 rows; JSON envelope max 4 MiB + 1 KiB; preview20rows, at most100 returned errors with errorCount. Exact header set; full server validation, duplicates withinfile andDB.
- POST /api/imports/commit {csvText,previewHash,confirmed:true} -> {data: ImportResult},201. Server verifies unchanged hash, parses and revalidates all rows and DB uniqueness, then transaction inserts whole batch or none.
- GET /api/insights InsightsQuery -> {data: Insights}; full filtered set before aggregation, never page-limited.
- POST /api/fx/refresh -> {data: FxStatus}; authenticated same-origin HR retry. GET /api/cron/fx is separately authenticated with CRON_SECRET Bearer token.

Country is supported ISO code; department/jobRole are trimmed bounded strings and may be created through employee form. Country and salary currency are independent. Salaried full-time, part-time and contract employees; no hourly pay. Joining date cannot be future. Initial salary positive, at most999999999999.99 and precision compatible (JPY0, others2). Unique code and normalized email. Archive preserves records; reject salary edit while archived.
