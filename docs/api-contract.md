# API contract v1

Types: src/shared/contracts.ts. JSON decimal strings for money; dates YYYY-MM-DD and timestamps ISO UTC. Responses use {data: ...} unless otherwise specified. All application endpoints require a valid HR session; GET /api/session returns {user: HrUser|null}. Better Auth uses POST /api/auth/sign-in/email and /sign-out; public sign-up disabled. Mutations verify request origin; JSON only. Errors {error:{code,message,details?}}, with 401/403/404/409/422 as appropriate. Never expose internal errors.

- GET /api/options -> {data: DirectoryOptions}.
- GET /api/employees with EmployeeQuery -> EmployeePage. Default active, page1, size25, name asc. pageSize max100. All sorting has stable ID tie-break.
- POST /api/employees EmployeeInput -> {data: Employee}, 201.
- GET /api/employees/:id -> {data: Employee}. PATCH same path EmployeeUpdate -> {data: Employee}; salary/currency not writable here.
- POST /api/employees/:id/salary SalaryChangeInput -> {data: Employee}. Reason required; transaction updates salary and creates immutable history. Version conflict409.
- POST /api/employees/:id/archive {version,archived:boolean} -> {data: Employee}.
- GET /api/employees/:id/history -> {data: SalaryHistory[]}, newest first.
- GET /api/employees/export same EmployeeFilters, all matches as downloadable CSV (native amounts).
- GET /api/imports/template -> CSV template. Columns are EmployeeInput field names in declaration order.
- POST /api/imports/preview {csvText:string} -> {data: ImportPreview}. Max2MB and10000rows; preview20rows, at most100 returned errors with errorCount. Exact header set; full server validation, duplicates withinfile andDB.
- POST /api/imports/commit {csvText,previewHash,confirmed:true} -> {data: ImportResult},201. Server verifies unchanged hash, parses and revalidates all rows and DB uniqueness, then transaction inserts whole batch or none.
- GET /api/insights InsightsQuery -> {data: Insights}; full filtered set before aggregation, never page-limited.
- POST /api/fx/refresh -> {data: FxStatus}; authenticated same-origin HR retry. GET /api/cron/fx is separately authenticated with CRON_SECRET Bearer token.

Country is supported ISO code; department/jobRole are trimmed bounded strings and may be created through employee form. Country and salary currency are independent. Salaried full-time, part-time and contract employees; no hourly pay. Joining date cannot be future. Initial salary positive, at most999999999999.99 and precision compatible (JPY0, others2). Unique code and normalized email. Archive preserves records; reject salary edit while archived.
