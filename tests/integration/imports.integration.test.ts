import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { EMPLOYEE_CSV_HEADERS, toCsv } from '../../src/server/domain/csv';
import { createPrismaClient, getPrisma } from '../../src/server/db/prisma';
import type { PrismaClient } from '../../src/server/generated/prisma/client';
import { commitImport, importHash, previewImport } from '../../src/server/services/imports';
import { requireIsolatedTestDatabaseUrl } from './test-database';

const NOW = new Date('2026-10-14T12:00:00.000Z');
const OWNED_CODE_PREFIX = 'B01-';
const OWNED_EMAIL_PREFIX = 'b01-';

let prisma: PrismaClient;
let initialized = false;

type CsvRowOptions = {
  currency?: 'JPY' | 'USD';
  salary?: string;
  name?: string;
};

function csvRow(prefix: string, index: number, options: CsvRowOptions = {}): string[] {
  const sequence = String(index).padStart(4, '0');
  const currency = options.currency ?? 'USD';
  return [
    `${prefix}-${sequence}`,
    options.name ?? `Import Employee ${sequence}`,
    `${prefix.toLowerCase()}-${sequence}@example.invalid`,
    currency === 'JPY' ? 'JP' : 'US',
    'Engineering',
    'Specialist',
    'FULL_TIME',
    '2020-01-15',
    options.salary ?? (currency === 'JPY' ? '7654321' : '60000.00'),
    currency,
  ];
}

function employeeCsv(prefix: string, count: number): string {
  const rows = Array.from({ length: count }, (_, offset) => {
    const index = offset + 1;
    if (index === 1) return csvRow(prefix, index, { salary: '12345.67' });
    if (index === count) {
      return csvRow(prefix, index, { currency: 'JPY', salary: '7654321' });
    }
    return csvRow(prefix, index);
  });
  return toCsv([EMPLOYEE_CSV_HEADERS, ...rows]);
}

async function removeOwnedEmployees(): Promise<void> {
  await prisma.employee.deleteMany({
    where: {
      OR: [
        { employeeCode: { startsWith: OWNED_CODE_PREFIX } },
        { email: { startsWith: OWNED_EMAIL_PREFIX } },
      ],
    },
  });
}

async function removeImportTestTriggers(): Promise<void> {
  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS "b01_late_failure" ON "employee"');
  await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS "b01_late_failure"()');
  await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS "b01_race_barrier" ON "employee"');
  await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS "b01_race_barrier"()');
}

async function waitForRaceWaiters(): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const rows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `SELECT count(*)::int AS count
       FROM pg_locks
       WHERE locktype = 'advisory'
         AND database = (SELECT oid FROM pg_database WHERE datname = current_database())
         AND classid = 0
         AND objid = 904210
         AND NOT granted`,
    );
    if ((rows[0]?.count ?? 0) >= 2) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('Duplicate import race did not reach its database barrier');
}

describe.sequential('CSV import persistence', () => {
  beforeAll(async () => {
    const testDatabaseUrl = requireIsolatedTestDatabaseUrl();
    vi.stubEnv('DATABASE_URL', testDatabaseUrl);
    prisma = createPrismaClient(testDatabaseUrl);
    initialized = true;
    await removeImportTestTriggers();
    await removeOwnedEmployees();
  });

  afterEach(async () => {
    if (!initialized) return;
    await removeImportTestTriggers();
    await removeOwnedEmployees();
  });

  afterAll(async () => {
    if (!initialized) return;
    await Promise.all([prisma.$disconnect(), getPrisma().$disconnect()]);
    vi.unstubAllEnvs();
  });

  it('imports more than one batch once and preserves exact salary currencies', async () => {
    const csvText = employeeCsv('B01-SUCCESS', 501);
    const preview = await previewImport(csvText, NOW);

    expect(preview).toMatchObject({ valid: true, totalRows: 501, errorCount: 0 });
    await expect(commitImport(csvText, preview.previewHash, NOW)).resolves.toEqual({
      imported: 501,
    });
    expect(await prisma.employee.count({
      where: { employeeCode: { startsWith: 'B01-SUCCESS-' } },
    })).toBe(501);

    const usd = await prisma.employee.findUniqueOrThrow({
      where: { employeeCode: 'B01-SUCCESS-0001' },
    });
    expect(usd.currency).toBe('USD');
    expect(usd.salary?.toFixed(2)).toBe('12345.67');
    const jpy = await prisma.employee.findUniqueOrThrow({
      where: { employeeCode: 'B01-SUCCESS-0501' },
    });
    expect(jpy.currency).toBe('JPY');
    expect(jpy.salary?.toFixed(2)).toBe('7654321.00');
  }, 120_000);

  it('rolls back the first batch when a later batch insert fails', async () => {
    await prisma.$executeRawUnsafe(`
      CREATE FUNCTION "b01_late_failure"() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.employee_code = 'B01-LATE-0501' THEN
          RAISE EXCEPTION 'forced late import test failure';
        END IF;
        RETURN NEW;
      END;
      $$
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "b01_late_failure"
      BEFORE INSERT ON "employee"
      FOR EACH ROW EXECUTE FUNCTION "b01_late_failure"()
    `);
    const csvText = employeeCsv('B01-LATE', 501);

    await expect(commitImport(csvText, importHash(csvText), NOW)).rejects.toThrow();
    expect(await prisma.employee.count({
      where: { employeeCode: { startsWith: 'B01-LATE-' } },
    })).toBe(0);
  }, 120_000);

  it('previews and persists reordered aliases with exact amounts and matching fields', async () => {
    const csvText = toCsv([
      ['currency', 'fullName', 'jobTitle', 'salary', 'employeeCode', 'hireDate', 'department', 'country', 'employmentType', 'email'],
      ['USD', 'Alias Employee', 'Analyst', '12345.67', 'B01-ALIAS-0001', '2020-01-15', 'Engineering', 'US', 'FULL_TIME', 'b01-alias-0001@example.invalid'],
    ]);
    const expected = {
      employeeCode: 'B01-ALIAS-0001', name: 'Alias Employee', email: 'b01-alias-0001@example.invalid',
      country: 'US', department: 'Engineering', jobRole: 'Analyst', employmentType: 'FULL_TIME',
      joiningDate: '2020-01-15', salary: '12345.67', currency: 'USD',
    };
    const preview = await previewImport(csvText, NOW);
    expect(preview).toMatchObject({ valid: true, totalRows: 1, errorCount: 0, preview: [expected] });
    expect(preview.previewHash).toBe(importHash(csvText));
    await expect(commitImport(csvText, preview.previewHash, NOW)).resolves.toEqual({ imported: 1 });

    const saved = await prisma.employee.findUniqueOrThrow({ where: { employeeCode: expected.employeeCode } });
    expect({ ...saved, joiningDate: saved.joiningDate.toISOString().slice(0, 10), salary: saved.salary?.toFixed(2) })
      .toMatchObject(expected);
  });

  it('saves missing salary as pending after preview and confirmation', async () => {
    const csvText = toCsv([
      ['employeeCode', 'fullName', 'email', 'country', 'department', 'jobTitle', 'employmentType', 'hireDate', 'currency'],
      ['B01-MISSING-0001', 'Missing Salary', 'b01-missing-0001@example.invalid', 'US', 'Engineering', 'Analyst', 'FULL_TIME', '2020-01-15', 'USD'],
    ]);
    const preview = await previewImport(csvText, NOW);
    expect(preview).toMatchObject({ valid: true, errorCount: 0, salaryPendingCount: 1,
      preview: [expect.objectContaining({ employeeCode: 'B01-MISSING-0001', salary: null })] });
    await expect(commitImport(csvText, preview.previewHash, NOW)).resolves.toEqual({ imported: 1 });
    expect(await prisma.employee.findUniqueOrThrow({ where: { employeeCode: 'B01-MISSING-0001' } }))
      .toMatchObject({ salary: null, status: 'ACTIVE' });
  });

  it('rejects changed confirmation content before writing either version', async () => {
    const previewedCsv = toCsv([
      EMPLOYEE_CSV_HEADERS,
      csvRow('B01-CHANGED', 1, { name: 'Previewed Name' }),
    ]);
    const changedCsv = toCsv([
      EMPLOYEE_CSV_HEADERS,
      csvRow('B01-CHANGED', 1, { name: 'Changed Name' }),
    ]);
    const preview = await previewImport(previewedCsv, NOW);

    await expect(commitImport(changedCsv, preview.previewHash, NOW)).rejects.toMatchObject({
      status: 409,
      code: 'IMPORT_CHANGED',
    });
    expect(await prisma.employee.count({
      where: { employeeCode: { startsWith: 'B01-CHANGED-' } },
    })).toBe(0);
  });

  it('allows exactly one concurrent import of the same employee', async () => {
    await prisma.$executeRawUnsafe(`
      CREATE FUNCTION "b01_race_barrier"() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.employee_code LIKE 'B01-RACE-%' THEN
          PERFORM pg_advisory_xact_lock(904210);
        END IF;
        RETURN NEW;
      END;
      $$
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "b01_race_barrier"
      BEFORE INSERT ON "employee"
      FOR EACH ROW EXECUTE FUNCTION "b01_race_barrier"()
    `);

    let reportBarrierHeld = () => {};
    let releaseBarrier = () => {};
    const barrierHeld = new Promise<void>((resolve) => {
      reportBarrierHeld = resolve;
    });
    const barrierCanRelease = new Promise<void>((resolve) => {
      releaseBarrier = resolve;
    });
    const barrier = prisma.$transaction(async (tx) => {
      await tx.$queryRawUnsafe('SELECT pg_advisory_lock(904210)::text AS locked');
      reportBarrierHeld();
      await barrierCanRelease;
      await tx.$queryRawUnsafe('SELECT pg_advisory_unlock(904210)');
    }, { timeout: 120_000 });

    await Promise.race([barrierHeld, barrier]);
    const csvText = toCsv([EMPLOYEE_CSV_HEADERS, csvRow('B01-RACE', 1)]);
    const digest = importHash(csvText);
    const commits = [
      commitImport(csvText, digest, NOW),
      commitImport(csvText, digest, NOW),
    ];
    let coordinationError: unknown;
    try {
      await waitForRaceWaiters();
    } catch (error) {
      coordinationError = error;
    } finally {
      releaseBarrier();
      await barrier;
    }
    const results = await Promise.allSettled(commits);
    if (coordinationError) throw coordinationError;

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toEqual([
      expect.objectContaining({
        reason: expect.objectContaining({ status: 409, code: 'IMPORT_CONFLICT' }),
      }),
    ]);
    expect(await prisma.employee.count({
      where: { employeeCode: 'B01-RACE-0001' },
    })).toBe(1);
  }, 120_000);

  it('rejects fractional JPY without persisting the invalid amount or currency', async () => {
    const csvText = toCsv([
      EMPLOYEE_CSV_HEADERS,
      csvRow('B01-PRECISION', 1, { currency: 'JPY', salary: '100.01' }),
    ]);

    await expect(commitImport(csvText, importHash(csvText), NOW)).rejects.toMatchObject({
      status: 422,
      code: 'IMPORT_INVALID',
      details: expect.objectContaining({ errorCount: 1 }),
    });
    expect(await prisma.employee.count({
      where: { employeeCode: 'B01-PRECISION-0001' },
    })).toBe(0);
  });
});
