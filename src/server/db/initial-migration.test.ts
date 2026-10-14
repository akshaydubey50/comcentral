import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const migrationPath = fileURLToPath(
  new URL('../../../prisma/migrations/202610140001_init/migration.sql', import.meta.url),
);
const migration = readFileSync(migrationPath, 'utf8');

function extractTable(tableName: string): string {
  const table = migration.match(new RegExp(`CREATE TABLE "${tableName}" \\(([\\s\\S]*?)\\n\\);`));
  if (!table?.[1]) {
    throw new Error(`Table definition not found: ${tableName}`);
  }
  return table[1];
}

function extractCheckRegex(constraintName: string): RegExp {
  const check = migration.match(
    new RegExp(`CONSTRAINT "${constraintName}" CHECK \\(([^\\r\\n]+)\\)`),
  );
  const regexLiteral = check?.[1]?.match(/~ '([^']+)'$/);
  if (!regexLiteral?.[1]) {
    throw new Error(`Complete SQL regex check not found: ${constraintName}`);
  }
  return new RegExp(regexLiteral[1]);
}

describe('initial database migration', () => {
  it('creates the expected tables without repeating schema objects', () => {
    const tables = [...migration.matchAll(/CREATE TABLE "([^"]+)"/g)].map((match) => match[1]);
    const createdObjects = [
      ...migration.matchAll(
        /CREATE (?:UNIQUE )?(?:TABLE|INDEX|FUNCTION|TRIGGER) "?([a-z][a-z0-9_]*)"?/g,
      ),
    ].map((match) => match[1]);

    expect(tables).toEqual([
      'user',
      'session',
      'account',
      'verification',
      'rate_limit',
      'seed_marker',
      'employee',
      'salary_history',
      'fx_snapshot',
      'fx_refresh_attempt',
    ]);
    expect(createdObjects.filter((name, index) => createdObjects.indexOf(name) !== index)).toEqual(
      [],
    );
  });

  it('keeps employee identifier and trimmed-text checks intact', () => {
    const employeeCode = extractCheckRegex('employee_code_shape');
    const employeeTable = extractTable('employee');

    for (const value of ['A', 'EMP_01.2-A']) {
      expect(employeeCode.test(value)).toBe(true);
    }
    for (const value of ['', '-EMP', 'EMP 1', 'EMP-01!']) {
      expect(employeeCode.test(value)).toBe(false);
    }
    expect(employeeTable).toContain('CONSTRAINT "employee_text_trimmed"');
    for (const column of ['name', 'department', 'job_role']) {
      expect(employeeTable).toContain(`"${column}" = btrim("${column}")`);
    }
  });

  it('keeps salary history bounds and JPY precision checks intact', () => {
    const salaryHistoryTable = extractTable('salary_history').replace(/\s+/g, ' ');

    expect(salaryHistoryTable).toContain(
      'CONSTRAINT "salary_history_amount_range" CHECK ("previous_salary" <= 999999999999.99 AND "salary" <= 999999999999.99)',
    );
    expect(salaryHistoryTable).toContain('CONSTRAINT "salary_history_jpy_precision"');
    expect(salaryHistoryTable).toContain(
      `"previous_currency" <> 'JPY' OR "previous_salary" = trunc("previous_salary")`,
    );
    expect(salaryHistoryTable).toContain(`"currency" <> 'JPY' OR "salary" = trunc("salary")`);
  });

  it('validates FX checksums and complete rate objects', () => {
    const checksum = extractCheckRegex('fx_snapshot_checksum_shape');
    const fxSnapshotTable = extractTable('fx_snapshot');

    expect(checksum.test('a'.repeat(64))).toBe(true);
    for (const value of ['a'.repeat(63), 'a'.repeat(65), 'A'.repeat(64), `${'a'.repeat(63)}g`]) {
      expect(checksum.test(value)).toBe(false);
    }
    expect(fxSnapshotTable).toContain('CONSTRAINT "fx_snapshot_rates_object"');
    expect(fxSnapshotTable).toContain(`jsonb_typeof("rates") = 'object'`);
    for (const currency of ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'SGD']) {
      expect(fxSnapshotTable).toContain(`'${currency}'`);
    }
  });
});
