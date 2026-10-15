import { describe, expect, it } from 'vitest';

import { EMPLOYEE_CSV_HEADERS, parseEmployeeCsv, toCsv } from './csv';

const validRow =
  'ACME-001,Ada Lovelace,ada@example.com,GB,Engineering,Principal Engineer,FULL_TIME,2020-02-29,100000.50,GBP';

describe('employee CSV', () => {
  it('accepts the exact contract header and valid rows', () => {
    const result = parseEmployeeCsv(
      `${EMPLOYEE_CSV_HEADERS.join(',')}\n${validRow}\n`,
      new Date('2026-10-14T12:00:00Z'),
    );

    expect(result.errorCount).toBe(0);
    expect(result.rows[0]?.email).toBe('ada@example.com');
  });



  it('rejects a header-only empty batch', () => {
    const result = parseEmployeeCsv(
      EMPLOYEE_CSV_HEADERS.join(',') + '\n',
      new Date('2026-10-14T12:00:00Z'),
    );
    expect(result.errorCount).toBe(1);
    expect(result.errors[0]?.message).toMatch(/at least one/i);
  });

  it('reports duplicate employee codes and normalized emails in the file', () => {
    const result = parseEmployeeCsv(
      `${EMPLOYEE_CSV_HEADERS.join(',')}\n${validRow}\nACME-001,Grace Hopper,ADA@EXAMPLE.COM,US,Engineering,Principal Engineer,FULL_TIME,2020-01-01,120000.00,USD\n`,
      new Date('2026-10-14T12:00:00Z'),
    );

    expect(result.errors.map((error) => error.field)).toEqual(
      expect.arrayContaining(['employeeCode', 'email']),
    );
  });

  it('protects exported cells from spreadsheet formulas', () => {
    const csv = toCsv([EMPLOYEE_CSV_HEADERS, ['=CMD()', '+1', '-2', '@SUM(A1)', 'safe']]);
    expect(csv).toContain("'=CMD()");
    expect(csv).toContain("'+1");
    expect(csv).toContain("'-2");
    expect(csv).toContain("'@SUM(A1)");

    const controlled = toCsv([["\n=CMD()", "\tSAFE"]]);
    expect(controlled).toContain("'\n=CMD()");
    expect(controlled).toContain("'\tSAFE");
  });
});

describe('CSV header compatibility', () => {
  const now = new Date('2026-10-14T12:00:00Z');

  it('maps reordered canonical columns to their original employee fields', () => {
    const canonical = parseEmployeeCsv(EMPLOYEE_CSV_HEADERS.join(',') + '\n' + validRow, now);
    const result = parseEmployeeCsv(
      [...EMPLOYEE_CSV_HEADERS].reverse().join(',') + '\n' + validRow.split(',').reverse().join(','),
      now,
    );
    expect(result.errorCount).toBe(0);
    expect(result.rows).toEqual(canonical.rows);
    expect(result.rowNumbers).toEqual([2]);
  });

  it.each(['', '\uFEFF'])('accepts reordered aliases with BOM prefix %j', (prefix) => {
    const canonical = parseEmployeeCsv(EMPLOYEE_CSV_HEADERS.join(',') + '\n' + validRow, now);
    const result = parseEmployeeCsv(
      prefix + 'currency,fullName,jobTitle,salary,employeeCode,hireDate,department,country,employmentType,email\n' +
        'GBP,Ada Lovelace,Principal Engineer,100000.50,ACME-001,2020-02-29,Engineering,GB,FULL_TIME,ada@example.com',
      now,
    );
    expect(result.errorCount).toBe(0);
    expect(result.rows).toEqual(canonical.rows);
    expect(result.rows[0]?.salary).toBe('100000.50');
    expect(result.rowNumbers).toEqual([2]);
  });

  it('reports missing employeeCode and salary without guessing from an id', () => {
    const result = parseEmployeeCsv(
      'id,fullName,email,jobTitle,department,country,currency,employmentType,hireDate\n' +
        'internal-001,Ada Lovelace,ada@example.com,Principal Engineer,Engineering,GB,GBP,FULL_TIME,2020-02-29',
      now,
    );
    expect(result.errorCount).toBe(3);
    expect(result.errors).toEqual([
      { row: 1, field: 'header', message: 'Unsupported column "id". Use the employee CSV template.' },
      { row: 1, field: 'header', message: 'Missing required column "employeeCode".' },
      { row: 1, field: 'header', message: 'Missing required column "salary".' },
    ]);
    expect(result.rows).toEqual([]);
    expect(result.totalRows).toBe(0);
  });

  it.each(['name', 'fullName'])('rejects duplicate name columns supplied as %s', (duplicate) => {
    const result = parseEmployeeCsv(
      EMPLOYEE_CSV_HEADERS.join(',') + ',' + duplicate + '\n' + validRow + ',Other name',
      now,
    );
    expect(result.errorCount).toBe(1);
    expect(result.errors[0]?.message).toBe('Duplicate column for "name". Use each employee field once.');
    expect(result.rows).toEqual([]);
  });

  it.each(['__proto__', 'constructor'])('rejects unsupported column %s', (unknown) => {
    const result = parseEmployeeCsv(
      EMPLOYEE_CSV_HEADERS.join(',') + ',' + unknown + '\n' + validRow + ',unused',
      now,
    );
    expect(result.errorCount).toBe(1);
    expect(result.errors[0]?.message).toBe(`Unsupported column "${unknown}". Use the employee CSV template.`);
    expect(result.rows).toEqual([]);
  });

  it.each([validRow + ',extra', validRow.split(',').slice(0, -1).join(',')])(
    'still rejects incorrect row widths',
    (row) => {
      const result = parseEmployeeCsv(EMPLOYEE_CSV_HEADERS.join(',') + '\n' + row, now);
      expect(result.errorCount).toBe(1);
      expect(result.errors[0]).toEqual({ row: 2, field: 'row', message: 'Expected 10 columns' });
      expect(result.rows).toEqual([]);
    },
  );
});
