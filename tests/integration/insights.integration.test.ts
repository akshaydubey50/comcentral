import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createPrismaClient, getPrisma } from '../../src/server/db/prisma';
import type { Prisma, PrismaClient } from '../../src/server/generated/prisma/client';
import { getInsights } from '../../src/server/services/insights';
import { requireIsolatedTestDatabaseUrl } from './test-database';

const NOW = new Date('2026-02-28T12:00:00.000Z');
const OWNED_CODE_PREFIX = 'B04-CLEAN-';
const OWNED_EMAIL_PREFIX = 'b04-clean-';

let prisma: PrismaClient;
let initialized = false;

function key(): string {
  return randomUUID().slice(0, 8);
}

function employeeRow(
  testKey: string,
  index: number,
  overrides: Partial<Prisma.EmployeeCreateManyInput> = {},
): Prisma.EmployeeCreateManyInput {
  const sequence = String(index).padStart(2, '0');
  return {
    id: `b04-clean-${testKey}-${sequence}`,
    employeeCode: `${OWNED_CODE_PREFIX}${testKey}-${sequence}`,
    name: `B04 Employee ${sequence}`,
    email: `${OWNED_EMAIL_PREFIX}${testKey}-${sequence}@example.invalid`,
    country: 'US',
    department: `B04 Department ${testKey}`,
    jobRole: 'Analyst',
    employmentType: 'FULL_TIME',
    joiningDate: new Date('2020-01-01T00:00:00.000Z'),
    salary: '50000.00',
    currency: 'USD',
    ...overrides,
  };
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

describe.sequential('persisted reporting calculations', () => {
  beforeAll(async () => {
    const testDatabaseUrl = requireIsolatedTestDatabaseUrl();
    vi.stubEnv('DATABASE_URL', testDatabaseUrl);
    prisma = createPrismaClient(testDatabaseUrl);
    initialized = true;
    await removeOwnedEmployees();
  });

  afterEach(async () => {
    if (!initialized) return;
    await removeOwnedEmployees();
  });

  afterAll(async () => {
    if (!initialized) return;
    await Promise.all([prisma.$disconnect(), getPrisma().$disconnect()]);
    vi.unstubAllEnvs();
  });

  it('uses every active filtered row while separating native currencies and archived records', async () => {
    const testKey = key();
    const department = `B04 Summary ${testKey}`;
    await prisma.employee.createMany({
      data: [
        employeeRow(testKey, 1, { department, salary: '10000.00', currency: 'USD' }),
        employeeRow(testKey, 2, { department, salary: '25000.00', currency: 'USD' }),
        employeeRow(testKey, 3, { department, salary: '50000.00', currency: 'USD' }),
        employeeRow(testKey, 4, { department, salary: '100000.00', currency: 'USD' }),
        employeeRow(testKey, 5, { department, salary: '3000000', currency: 'JPY' }),
        employeeRow(testKey, 6, { department, salary: '5000000', currency: 'JPY' }),
        employeeRow(testKey, 7, {
          department,
          salary: '200000.00',
          currency: 'USD',
          status: 'ARCHIVED',
        }),
      ],
    });

    const active = await getInsights({ department, groupBy: 'department' }, NOW);
    expect(active).toMatchObject({
      headcount: 6,
      asOf: '2026-02-28',
      currencyMode: 'NATIVE',
      groupBy: 'department',
      reportingAvailable: true,
    });
    expect(active.summaries).toEqual([
      {
        currency: 'USD',
        count: 4,
        total: '185000.00',
        min: '10000.00',
        max: '100000.00',
        average: '46250.00',
        median: '37500.00',
        p25: '21250.00',
        p75: '62500.00',
      },
      {
        currency: 'JPY',
        count: 2,
        total: '8000000',
        min: '3000000',
        max: '5000000',
        average: '4000000',
        median: '4000000',
        p25: '3500000',
        p75: '4500000',
      },
    ]);
    expect(active.groups).toEqual([
      { label: department, ...active.summaries[1] },
      { label: department, ...active.summaries[0] },
    ]);
    expect(active.bands.filter(({ currency }) => currency === 'USD')).toEqual([
      { currency: 'USD', label: '0.00–<25000.00', lower: '0.00', upper: '25000.00', count: 1 },
      { currency: 'USD', label: '25000.00–<50000.00', lower: '25000.00', upper: '50000.00', count: 1 },
      { currency: 'USD', label: '50000.00–<75000.00', lower: '50000.00', upper: '75000.00', count: 1 },
      { currency: 'USD', label: '75000.00–<100000.00', lower: '75000.00', upper: '100000.00', count: 0 },
      { currency: 'USD', label: '100000.00–<150000.00', lower: '100000.00', upper: '150000.00', count: 1 },
      { currency: 'USD', label: '150000.00–<200000.00', lower: '150000.00', upper: '200000.00', count: 0 },
      { currency: 'USD', label: '200000.00+', lower: '200000.00', upper: null, count: 0 },
    ]);
    expect(active.bands.filter(({ currency }) => currency === 'JPY')).toEqual([
      { currency: 'JPY', label: '0–<3000000', lower: '0', upper: '3000000', count: 0 },
      { currency: 'JPY', label: '3000000–<5000000', lower: '3000000', upper: '5000000', count: 1 },
      { currency: 'JPY', label: '5000000–<7000000', lower: '5000000', upper: '7000000', count: 1 },
      { currency: 'JPY', label: '7000000–<10000000', lower: '7000000', upper: '10000000', count: 0 },
      { currency: 'JPY', label: '10000000–<15000000', lower: '10000000', upper: '15000000', count: 0 },
      { currency: 'JPY', label: '15000000–<20000000', lower: '15000000', upper: '20000000', count: 0 },
      { currency: 'JPY', label: '20000000+', lower: '20000000', upper: null, count: 0 },
    ]);

    const archived = await getInsights({ department, status: 'ARCHIVED' }, NOW);
    expect(archived.headcount).toBe(1);
    expect(archived.summaries).toEqual([
      expect.objectContaining({ currency: 'USD', count: 1, total: '200000.00' }),
    ]);
    const allStatuses = await getInsights({ department, status: 'ALL' }, NOW);
    expect(allStatuses.headcount).toBe(7);
    expect(allStatuses.summaries.find(({ currency }) => currency === 'USD')).toMatchObject({
      count: 5,
      total: '385000.00',
    });
  });

  it('reports all 29 filtered employees and separates evaluated, small, and zero-IQR cohorts', async () => {
    const testKey = key();
    const department = `B04 Outliers ${testKey}`;
    const jobRole = `Outlier Role ${testKey}`;
    const fullTimeSalaries = ['10', '11', '12', '13', '14', '15', '16', '17', '18', '100'];
    const partTimeSalaries = ['1', '1', '1', '1', '1', '1', '1', '1', '1000'];
    const rows = [
      ...fullTimeSalaries.map((salary, index) => employeeRow(testKey, index + 1, {
        department,
        jobRole,
        salary,
        employmentType: 'FULL_TIME',
      })),
      ...partTimeSalaries.map((salary, index) => employeeRow(testKey, index + 11, {
        department,
        jobRole,
        salary,
        employmentType: 'PART_TIME',
      })),
      ...Array.from({ length: 10 }, (_, index) => employeeRow(testKey, index + 20, {
        department,
        jobRole,
        salary: '50',
        employmentType: 'CONTRACT',
      })),
    ];
    await prisma.employee.createMany({ data: rows });

    const result = await getInsights({ department, groupBy: 'jobRole' }, NOW);
    expect(result.headcount).toBe(29);
    expect(result.summaries).toEqual([
      expect.objectContaining({ currency: 'USD', count: 29, total: '1734.00' }),
    ]);
    expect(result.groups).toEqual([
      expect.objectContaining({ label: jobRole, currency: 'USD', count: 29, total: '1734.00' }),
    ]);
    expect(result.outliers.minimumGroupSize).toBe(10);
    expect(result.outliers.cohorts).toEqual([
      { country: 'US', currency: 'USD', jobRole, employmentType: 'CONTRACT', count: 10, state: 'ZERO_IQR' },
      { country: 'US', currency: 'USD', jobRole, employmentType: 'FULL_TIME', count: 10, state: 'EVALUATED' },
      { country: 'US', currency: 'USD', jobRole, employmentType: 'PART_TIME', count: 9, state: 'INSUFFICIENT_DATA' },
    ]);
    expect(result.outliers.total).toBe(1);
    expect(result.outliers.data).toEqual([
      expect.objectContaining({
        employeeCode: `${OWNED_CODE_PREFIX}${testKey}-10`,
        employmentType: 'FULL_TIME',
        salary: '100.00',
        groupSize: 10,
        lowerFence: '5.50',
        upperFence: '23.50',
        direction: 'HIGH',
      }),
    ]);
  });

  it('places anniversary and leap-day hires in completed-calendar-year tenure buckets', async () => {
    const testKey = key();
    const department = `B04 Tenure ${testKey}`;
    await prisma.employee.createMany({
      data: [
        employeeRow(testKey, 1, { department, joiningDate: new Date('2025-03-01T00:00:00.000Z'), salary: '10' }),
        employeeRow(testKey, 2, { department, joiningDate: new Date('2025-02-28T00:00:00.000Z'), salary: '20' }),
        employeeRow(testKey, 3, { department, joiningDate: new Date('2024-02-29T00:00:00.000Z'), salary: '300' }),
        employeeRow(testKey, 4, { department, joiningDate: new Date('2023-02-28T00:00:00.000Z'), salary: '40' }),
        employeeRow(testKey, 5, { department, joiningDate: new Date('2021-03-01T00:00:00.000Z'), salary: '50' }),
        employeeRow(testKey, 6, { department, joiningDate: new Date('2021-02-28T00:00:00.000Z'), salary: '60' }),
        employeeRow(testKey, 7, { department, joiningDate: new Date('2016-03-01T00:00:00.000Z'), salary: '70' }),
        employeeRow(testKey, 8, { department, joiningDate: new Date('2016-02-29T00:00:00.000Z'), salary: '800' }),
      ],
    });

    const result = await getInsights({ department }, NOW);
    expect(result.asOf).toBe('2026-02-28');
    expect(result.tenure).toEqual([
      expect.objectContaining({ bucket: '<1', currency: 'USD', count: 1, total: '10.00' }),
      expect.objectContaining({ bucket: '1–<3', currency: 'USD', count: 2, total: '320.00', average: '160.00', median: '160.00' }),
      expect.objectContaining({ bucket: '3–<5', currency: 'USD', count: 2, total: '90.00', average: '45.00', median: '45.00' }),
      expect.objectContaining({ bucket: '5–<10', currency: 'USD', count: 2, total: '130.00', average: '65.00', median: '65.00' }),
      expect.objectContaining({ bucket: '10+', currency: 'USD', count: 1, total: '800.00' }),
    ]);
  });
});
