# Importing employee CSV data

ComCentral imports employee records supplied by HR. It does not fetch employee or salary data from the internet. Use an authorized HRIS or spreadsheet export, remove fields that are not part of the contract below, and save the result as UTF-8 CSV. Export Excel workbooks to CSV before upload.

## Get a compatible CSV

The safest starting point is the application's current template:

1. Sign in and open `/imports`.
2. Select **Download template**. The authenticated template route downloads `acme-employee-import-template.csv` with the canonical header and no employee rows.
3. Copy authorized employee data into those columns. Columns may be reordered, and the four documented aliases below may replace their canonical names.

For demonstrations, use labelled synthetic records. The deterministic database seed is a separate operation: `npm run db:seed` writes directly to an explicitly acknowledged demo/test database and does not generate a CSV. Follow the [deployment runbook](deployment.md) before using it.

## Import workflow

1. Select **Choose CSV**, then **Validate and preview**.
2. Review the total rows, salary-pending count, sample rows and every reported error.
3. Correct the source file, select the corrected file and preview it again.
4. Select **Confirm and import** only after reviewing a valid preview.
5. Open **Employees** to find the imported records. A blank or omitted salary displays as **Salary pending**; use **Add salary** later to record a positive amount, reason and immutable history.

Preview does not reserve employee codes or emails. Confirmation verifies that the CSV content matches the preview hash, parses and validates it again, checks current database uniqueness, and creates the entire batch in one serializable transaction. A conflict or invalid row saves none of the batch. Import creates employees; it never updates existing records or overwrites salaries.

## Canonical template

```csv
employeeCode,name,email,country,department,jobRole,employmentType,joiningDate,salary,currency
EXAMPLE-001,Synthetic Employee,employee001@example.invalid,IN,Engineering,Analyst,FULL_TIME,2024-01-15,900000.00,INR
EXAMPLE-002,Synthetic Pending,employee002@example.invalid,BR,People Operations,Coordinator,INTERN,2025-02-03,,BRL
```

The examples are synthetic. Salary is annual contractual base pay in major currency units: `900000.00` INR means rupees, not paise. Do not use currency symbols, thousands separators or scientific notation. Dates use `YYYY-MM-DD` and cannot be in the future.

## Columns and aliases

Header spelling is case-sensitive. Each canonical field may appear once, in any order. The salary column is optional; every other canonical field is required. Unknown columns, repeated columns and canonical/alias collisions are rejected.

| Canonical column | Accepted alias | Rules |
|---|---|---|
| `employeeCode` | `id` | 1–40 characters; starts with a letter or number; then letters, numbers, periods, underscores or hyphens |
| `name` | `fullName` | Required text, at most 160 characters |
| `email` | — | Valid email, at most 254 characters; trimmed and normalized to lowercase |
| `country` | — | Supported two-letter code listed below; normalized to uppercase |
| `department` | — | Required text, at most 100 characters |
| `jobRole` | `jobTitle` | Required text, at most 100 characters |
| `employmentType` | — | One supported uppercase value listed below |
| `joiningDate` | `hireDate` | Real `YYYY-MM-DD` date that is not in the future |
| `salary` | — | Optional; blank means pending; a supplied value follows the salary rules below |
| `currency` | — | Required even when salary is pending; one supported uppercase code listed below |

Adding both an alias and its canonical field, such as `id` and `employeeCode`, is an ambiguous duplicate and is rejected.

## Values and limits

- At least one employee row; at most 10,000 rows and 2 MiB of UTF-8 CSV content.
- Employee codes and normalized emails must be unique within the file and against existing employees.
- Countries: `AU`, `BR`, `CA`, `DE`, `FR`, `GB`, `IN`, `JP`, `SG`, `US`.
- Currencies: `AUD`, `BRL`, `CAD`, `EUR`, `GBP`, `INR`, `JPY`, `SGD`, `USD`.
- Employment types: `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERN`.
- A supplied salary must be a positive plain decimal no greater than `999999999999.99`. It may have at most two decimal places; JPY must be a whole number.
- Pending salaries count toward employee headcount but are excluded from pay calculations until HR records the first salary.

If a source contains more than 10,000 records, split it at CSV record boundaries into separate files. Preserve every field value and upload each batch independently; never silently discard the remainder.

## Adapting another system's export

The accepted aliases support exports shaped like:

```csv
id,fullName,email,country,department,jobTitle,employmentType,hireDate,currency
SOURCE-001,Synthetic Employee,employee001@example.invalid,FR,Finance,Analyst,FULL_TIME,2023-06-15,EUR
```

Here, `id` becomes `employeeCode` and the missing salary column creates a pending employee. The source ID must still satisfy ComCentral's employee-code rules and remain stable and unique.

Confirm the source system's salary unit before transforming pay. ComCentral expects major units. If documentation proves that a two-decimal currency is exported in minor units, convert exactly (`9000000` cents becomes `90000.00`); do not apply that conversion to a major-unit export. JPY has zero decimal places and is not divided by 100. Never guess an exchange rate or salary.

## API and source references

The browser sends preview JSON as `{ "csvText": "..." }`. Confirmation sends the unchanged `csvText`, the returned 64-character `previewHash`, and `confirmed: true`. These requests are authenticated and subject to request admission and body limits.

The implementation sources are [CSV parsing](../src/server/domain/csv.ts), [validation](../src/shared/validation.ts), [preview/commit](../src/server/services/imports.ts), and the [template route](../src/app/api/imports/template/route.ts). Execution evidence and snapshot limitations remain in [validation.md](validation.md).
