# Getting employee CSV data into ComCentral

The importer accepts employee records supplied by HR. It does not fetch employee or salary data from the internet. For real use, export the organization's authorized HR spreadsheet or HRIS, map its columns to the fixed template, and save as UTF-8 CSV. Excel workbooks must first be exported to CSV.

## Use the application

1. Sign in and open `/imports`.
2. Select **Download template**. The download contains the required header, without employee rows.
3. Fill the template without renaming or reordering its columns.
4. Select **Choose CSV**, then **Validate and preview**.
5. Correct every reported error, choose the corrected file, and validate again.
6. Select **Confirm and import** only after reviewing the preview. Confirmation revalidates the unchanged file and creates the entire batch or none.

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

- Exact ordered header shown above; at least one employee row.
- Maximum 10,000 rows and 2 MiB per file.
- Unique employee codes and normalized emails, both within the file and against existing employees.
- Employee codes: 1-40 characters; letters, numbers, periods, underscores and hyphens, beginning with a letter or number.
- Countries: `AU`, `CA`, `DE`, `GB`, `IN`, `JP`, `SG`, `US`.
- Currencies: `AUD`, `CAD`, `EUR`, `GBP`, `INR`, `JPY`, `SGD`, `USD`.
- Employment types: `FULL_TIME`, `PART_TIME`, `CONTRACT`.
- Salary must be positive, use the allowed range, and have at most two decimal places; JPY must be a whole number.
- Import only creates new employees; it does not overwrite or update salary records.

Rules are implemented in [CSV parsing](../src/server/domain/csv.ts), [validation](../src/shared/validation.ts), and [preview/commit](../src/server/services/imports.ts).

## Using a PayScope export

The reviewed PayScope repository contains no `.csv` dataset file. It generates demo employees through its seed code. An HR Manager can use its Employees page's CSV export. Viewer exports omit salary and cannot supply the required salary data for ComCentral.

PayScope's export cannot be uploaded unchanged:

| PayScope column | ComCentral column | Conversion |
|---|---|---|
| `id` | `employeeCode` | Use a unique stable code satisfying the rules above; its UUID can fit the format |
| `fullName` | `name` | Preserve the name |
| `jobTitle` | `jobRole` | Preserve the role |
| `hireDate` | `joiningDate` | Keep `YYYY-MM-DD` |
| `salary` | `salary` | Convert integer minor units to an exact major-unit decimal string |
| Other common columns | Same names | Reorder to match the exact ComCentral header |

For shared two-decimal currencies, `9000000` becomes `90000.00`. JPY uses zero decimal places and is not divided by 100. PayScope's seed also includes France, Brazil/BRL and interns; those values are outside ComCentral's current country/currency/employment-type scope. Exclude unsupported records from a demo import or make an explicit scope decision; silently relabelling them would change the meaning of the data.

Source: [PayScope export columns at the reviewed commit](https://github.com/meganathan-tech24/PayScope/blob/f6da3bb170eee144fddf312529e83533bfe6fba5/apps/api/src/modules/employees/employees.export.ts), [seed reference data](https://github.com/meganathan-tech24/PayScope/blob/f6da3bb170eee144fddf312529e83533bfe6fba5/apps/api/src/seed/reference-data.ts).
