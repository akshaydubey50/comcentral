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
