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

  it('accepts source ids as employee codes and omitted salary as pending', () => {
    const result = parseEmployeeCsv(
      'id,fullName,email,jobTitle,department,country,currency,employmentType,hireDate\n' +
        'internal-001,Ada Lovelace,ada@example.com,Principal Engineer,Engineering,GB,GBP,FULL_TIME,2020-02-29',
      now,
    );
    expect(result.errorCount).toBe(0);
    expect(result.rows[0]).toMatchObject({ employeeCode: 'internal-001', name: 'Ada Lovelace', salary: null });
    expect(result.totalRows).toBe(1);
  });

  it('accepts a blank salary while preserving paid values in the same import', () => {
    const result = parseEmployeeCsv(EMPLOYEE_CSV_HEADERS.join(',') + '\n' +
      validRow.replace('100000.50', '  ') + '\n' + validRow.replaceAll('ACME-001', 'ACME-002').replace('ada@example.com', 'paid@example.com'), now);
    expect(result.errorCount).toBe(0);
    expect(result.rows.map((row) => row.salary)).toEqual([null, '100000.50']);
  });

  it('rejects an ambiguous id and employeeCode pair', () => {
    const result = parseEmployeeCsv(EMPLOYEE_CSV_HEADERS.join(',') + ',id\n' + validRow + ',other-id', now);
    expect(result.errors).toEqual([{ row: 1, field: 'header', message: 'Duplicate column for "employeeCode". Use each employee field once.' }]);
    expect(result.rows).toEqual([]);
  });

  it('accepts France, Brazil, BRL and interns without relabelling source data', () => {
    const result = parseEmployeeCsv('id,fullName,email,jobTitle,department,country,currency,employmentType,hireDate\n' +
      'FR-1,France Intern,fr@example.com,Analyst,Engineering,FR,EUR,INTERN,2020-02-29\n' +
      'BR-1,Brazil Intern,br@example.com,Analyst,Engineering,BR,BRL,INTERN,2020-02-29', now);
    expect(result.errorCount).toBe(0);
    expect(result.rows.map(({ country, currency, employmentType, salary }) => ({ country, currency, employmentType, salary }))).toEqual([
      { country: 'FR', currency: 'EUR', employmentType: 'INTERN', salary: null },
      { country: 'BR', currency: 'BRL', employmentType: 'INTERN', salary: null },
    ]);
  });

  it.each(['0', '-1', '100.001', 'not-a-number'])('does not turn an invalid nonblank salary %s into a pending value', (salary) => {
    const result = parseEmployeeCsv(EMPLOYEE_CSV_HEADERS.join(',') + '\n' + validRow.replace('100000.50', salary), now);
    expect(result.errorCount).toBeGreaterThan(0);
    expect(result.rows).toEqual([]);
  });

  it('still rejects a salary-free file exceeding 10000 rows', () => {
    const lines = ['id,fullName,email,jobTitle,department,country,currency,employmentType,hireDate'];
    for (let index = 0; index < 10001; index += 1) {
      lines.push(`DRAFT-${index},Draft ${index},draft${index}@example.invalid,Analyst,Quality,BR,BRL,INTERN,2020-01-01`);
    }
    const result = parseEmployeeCsv(lines.join('\n'), now);
    expect(result.totalRows).toBe(10001);
    expect(result.errorCount).toBe(1);
    expect(result.errors).toEqual([{ row: 10002, field: 'csvText', message: 'CSV exceeds the 10000 row limit' }]);
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
