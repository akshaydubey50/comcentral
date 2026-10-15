import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { createPrismaClient, getPrisma } from '../../src/server/db/prisma';
import type { PrismaClient } from '../../src/server/generated/prisma/client';
import { listEmployees } from '../../src/server/services/employees';
import { getInsights } from '../../src/server/services/insights';
import { exportEmployees } from '../../src/server/services/imports';
import { parseEmployeeFilters, parseEmployeeQuery, parseInsightsQuery } from '../../src/shared/validation';
import { requireIsolatedTestDatabaseUrl } from './test-database';

const prefix = 'READINESS-' + randomUUID().slice(0, 8);
let prisma: PrismaClient | undefined;

describe.sequential('salary readiness populations', () => {
  beforeAll(async () => {
    const url = requireIsolatedTestDatabaseUrl();
    vi.stubEnv('DATABASE_URL', url);
    prisma = createPrismaClient(url);
    await prisma.employee.createMany({ data: Array.from({ length: 30 }, (_, index) => ({
      employeeCode: `${prefix}-${String(index).padStart(2, '0')}`,
      name: `${prefix} Person ${index}`, email: `${prefix.toLowerCase()}-${index}@example.invalid`,
      country: 'BR', department: index === 29 ? 'Finance' : 'Engineering', jobRole: 'Analyst',
      employmentType: 'FULL_TIME', status: index === 27 || index === 28 ? 'ARCHIVED' : 'ACTIVE',
      salary: index < 12 || index === 27 || index === 29 ? null : '12345.67',
      currency: 'BRL', joiningDate: new Date('2020-01-01T00:00:00Z'),
    })) });
  });
  afterAll(async () => {
    if (prisma) {
      await prisma.employee.deleteMany({ where: { employeeCode: { startsWith: prefix } } });
      await Promise.all([prisma.$disconnect(), getPrisma().$disconnect()]);
    }
    vi.unstubAllEnvs();
  });

  it.each([
    ['PENDING', 'ACTIVE', 12], ['RECORDED', 'ACTIVE', 15],
    ['PENDING', 'ALL', 13], ['RECORDED', 'ALL', 16],
  ] as const)('keeps %s/%s list, report and export on the same full population', async (salaryStatus, status, total) => {
    const params = new URLSearchParams({ q: prefix, country: 'BR', department: 'Engineering',
      jobRole: 'Analyst', employmentType: 'FULL_TIME', salaryStatus, status, pageSize: '10' });
    const firstPage = await listEmployees(parseEmployeeQuery(params));
    expect(firstPage.pagination).toMatchObject({ total, totalPages: 2 });
    expect(firstPage.data).toHaveLength(10);
    expect(firstPage.data.every((row) => salaryStatus === 'PENDING' ? row.salary === null : row.salary === '12345.67')).toBe(true);

    params.set('page', '2');
    const secondPage = await listEmployees(parseEmployeeQuery(params));
    const listedCodes = [...firstPage.data, ...secondPage.data].map((row) => row.employeeCode);
    expect(new Set(listedCodes).size).toBe(total);

    const report = await getInsights(parseInsightsQuery(params));
    expect(report.headcount).toBe(total);
    expect(report.salaryPendingCount).toBe(salaryStatus === 'PENDING' ? total : 0);
    expect(report.summaries.reduce((sum, group) => sum + group.count, 0)).toBe(salaryStatus === 'PENDING' ? 0 : total);

    const csv = await exportEmployees(parseEmployeeFilters(params));
    const lines = csv.trim().split(/\r?\n/);
    expect(lines).toHaveLength(total + 1);
    for (const code of listedCodes) expect(csv).toContain(code);
    expect(csv).not.toContain(`${prefix}-29`);
  });
});
