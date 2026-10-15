# Getting employee CSV data into ComCentral

The importer accepts employee records supplied by HR. It does not fetch employee or salary data from the internet. For real use, export the organization's authorized HR spreadsheet or HRIS, supply the template's required fields, and save as UTF-8 CSV. Excel workbooks must first be exported to CSV.

## Use the application

1. Sign in and open `/imports`.
2. Select **Download template**. The download contains the required header, without employee rows.
3. Fill every required field; salary may be omitted or left blank for later assignment. Columns may be in any order. Supported alternatives are `id` for `employeeCode`, `fullName` for `name`, `jobTitle` for `jobRole`, and `hireDate` for `joiningDate`; use only one name for each field.
4. Select **Choose CSV**, then **Validate and preview**.
5. Correct every reported error, choose the corrected file, and validate again.
6. Select **Confirm and import** only after reviewing the preview and salary-pending count. Confirmation revalidates the unchanged file and creates the entire batch or none.
7. Open **Employees** to find the imported records; refresh preserves them. Missing salaries display **Salary pending**. Open an employee and select **Add salary** to assign a positive amount with a reason and immutable history.

```csv
employeeCode,name,email,country,department,jobRole,employmentType,joiningDate,salary,currency
EXAMPLE-001,Synthetic Employee,employee001@example.invalid,IN,Engineering,Analyst,FULL_TIME,2024-01-15,900000.00,INR
```

The example is synthetic. Salary means annual gross contractual base pay in major currency units: `900000.00` INR, not paise. Do not include currency symbols or thousands separators. Dates use `YYYY-MM-DD` and cannot be in the future.

## Ready-made synthetic files from this review

Two files were generated on 2026-10-14 from ComCentral's deterministic generator, with clearly synthetic names and `example.invalid` emails:

| File | Rows | Size | Parser result |
|---|---:|---:|---|
| `comcentral-synthetic-10-employees.csv` | 10 | 1,314 bytes | Zero errors |
| `comcentral-synthetic-10000-employees.csv` | 10,000 | 1,309,306 bytes | Zero errors |

Local delivery folder: `C:\Users\aksha\AppData\Local\Temp\comcentral-csv`. These are demo/import files, not production records. The files use different employee-code/email prefixes, so the small file does not duplicate rows in the large file. Reimporting the same file will correctly report duplicates. They were validated with the actual `parseEmployeeCsv` function; they were not imported into any database.

The underlying source is [seed-data.ts](../src/server/domain/seed-data.ts). `npm run db:seed` writes directly to a database; it does not produce a CSV file. Use it only for the separately configured demo environment described in the deployment runbook.

## Required values and limits

- All fields shown above except salary, each exactly once, in any order; at least one employee row. Header names are case-sensitive. Only the four documented aliases are accepted; unknown or duplicate mapped columns are rejected with specific errors.
- Maximum 10,000 rows and 2 MiB per file.
- Unique employee codes and normalized emails, both within the file and against existing employees.
- Employee codes: 1-40 characters; letters, numbers, periods, underscores and hyphens, beginning with a letter or number.
- Countries: `AU`, `BR`, `CA`, `DE`, `FR`, `GB`, `IN`, `JP`, `SG`, `US`.
- Currencies: `AUD`, `BRL`, `CAD`, `EUR`, `GBP`, `INR`, `JPY`, `SGD`, `USD`.
- Employment types: `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERN`.
- Salary may be absent or blank; no amount is guessed. A supplied salary must be positive, use the allowed range, and have at most two decimal places; JPY must be a whole number. Pending salaries count toward headcount but are excluded from pay calculations.
- Import only creates new employees; it does not overwrite or update salary records.

Rules are implemented in [CSV parsing](../src/server/domain/csv.ts), [validation](../src/shared/validation.ts), and [preview/commit](../src/server/services/imports.ts).

## Using a PayScope export

The reviewed PayScope repository contains no `.csv` dataset file. It generates demo employees through its seed code. Viewer exports omit salary and can now be imported as salary-pending employee records under the approved mapping below.

Check the exported columns and any supplied salary units:

| PayScope column | ComCentral column | Conversion |
|---|---|---|
| `id` | `employeeCode` | Approved alias; preserve the stable source value and enforce the same uniqueness and code rules |
| `fullName` | `name` | Accepted alias; preserve the name |
| `jobTitle` | `jobRole` | Accepted alias; preserve the role |
| `hireDate` | `joiningDate` | Accepted alias; keep `YYYY-MM-DD` |
| `salary` | `salary` | Convert integer minor units to an exact major-unit decimal string |
| Other common columns | Same names | Retain the required fields; column order does not matter |

An export with `id,fullName,email,jobTitle,department,country,currency,employmentType,hireDate` is accepted without adding a salary column. Source ids become employee codes and salaries remain null until HR supplies them. Adding both id and employeeCode is an ambiguous duplicate and is rejected.

If salary is present in minor units, convert exactly: for two-decimal currencies, `9000000` becomes `90000.00`. JPY uses zero decimal places and is not divided by 100. France, Brazil/BRL and interns are supported; do not relabel source records.

The inspected download contained 10,001 employee records. The approved batch limit stays at 10,000: split at CSV record boundaries and upload separate files; the app never silently drops an extra row. A private 10,000-row copy and one-row remainder were prepared without changing field values or the original download. Actual-file browser verification saved and fetched all 10,000 rows in an isolated database; no downloaded employee data is committed to Git. See [validation.md](validation.md) for evidence and the distinction from the configured application database.

Source: [PayScope export columns at the reviewed commit](https://github.com/meganathan-tech24/PayScope/blob/f6da3bb170eee144fddf312529e83533bfe6fba5/apps/api/src/modules/employees/employees.export.ts), [seed reference data](https://github.com/meganathan-tech24/PayScope/blob/f6da3bb170eee144fddf312529e83533bfe6fba5/apps/api/src/seed/reference-data.ts).
