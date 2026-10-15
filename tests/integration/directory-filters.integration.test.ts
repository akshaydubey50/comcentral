import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { EmployeeFilters } from '../../src/shared/contracts';
import { createPrismaClient, getPrisma } from '../../src/server/db/prisma';
import type { PrismaClient } from '../../src/server/generated/prisma/client';
import { listEmployees } from '../../src/server/services/employees';
import { parseEmployeeQuery } from '../../src/shared/validation';
import { requireIsolatedTestDatabaseUrl } from './test-database';

const prefix = 'DIRECTORY-' + randomUUID().slice(0, 8);
let prisma: PrismaClient | undefined;
const fixtures: Array<{
  employeeCode: string; name: string; email: string; country: string; department: string;
  jobRole: string; employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
  status: 'ACTIVE' | 'ARCHIVED'; currency: 'USD' | 'BRL'; salary: string | null; joiningDate: Date;
}> = [];
for (const country of ['US', 'BR'] as const) {
  for (const department of ['Engineering', 'Finance']) {
    for (const jobRole of ['Analyst', 'Manager']) {
      for (const employmentType of ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'] as const) {
        for (const status of ['ACTIVE', 'ARCHIVED'] as const) {
          const sequence = String(fixtures.length + 1).padStart(2, '0');
          fixtures.push({ employeeCode: prefix + '-' + sequence, name: prefix + ' Person ' + sequence,
            email: prefix.toLowerCase() + '-' + sequence + '@example.invalid', country, department,
            jobRole, employmentType, status, currency: country === 'BR' ? 'BRL' : 'USD',
            salary: employmentType === 'INTERN' ? null : '12345.67', joiningDate: new Date('2020-01-01T00:00:00Z') });
        }
      }
    }
  }
}

describe.sequential('directory filters and stable pagination', () => {
  beforeAll(async () => {
    const url = requireIsolatedTestDatabaseUrl();
    vi.stubEnv('DATABASE_URL', url);
    prisma = createPrismaClient(url);
    await prisma.employee.createMany({ data: fixtures });
  });
  afterAll(async () => {
    if (prisma) {
      await prisma.employee.deleteMany({ where: { employeeCode: { startsWith: prefix } } });
      await Promise.all([prisma.$disconnect(), getPrisma().$disconnect()]);
    }
    vi.unstubAllEnvs();
  });

  it.each<[string, EmployeeFilters, number]>([
    ['active default', {}, 32],
    ['country', { country: 'BR' }, 16],
    ['department', { department: 'Finance' }, 16],
    ['job role', { jobRole: 'Manager' }, 16],
    ['employment type including pending pay', { employmentType: 'INTERN' }, 8],
    ['archived status', { status: 'ARCHIVED' }, 32],
    ['all statuses', { status: 'ALL' }, 64],
    ['all dropdowns together', { country: 'BR', department: 'Finance', jobRole: 'Manager', employmentType: 'INTERN', status: 'ACTIVE' }, 1],
    ['combined filters with all statuses', { country: 'BR', department: 'Finance', jobRole: 'Manager', employmentType: 'INTERN', status: 'ALL' }, 2],
    ['valid country with no matches', { country: 'FR' }, 0],
  ])('applies %s before pagination', async (_name, filters, count) => {
    const params = new URLSearchParams({ q: prefix, pageSize: '100', ...filters });
    const query = parseEmployeeQuery(params);
    const result = await listEmployees(query);
    expect(result.pagination.total).toBe(count);
    expect(result.data).toHaveLength(count);
    for (const row of result.data) {
      expect(row.employeeCode.startsWith(prefix)).toBe(true);
      expect(row.status).toBe(filters.status === 'ALL' ? row.status : filters.status ?? 'ACTIVE');
      for (const key of ['country', 'department', 'jobRole', 'employmentType'] as const) {
        if (filters[key]) expect(row[key]).toBe(filters[key]);
      }
      if (filters.employmentType === 'INTERN') expect(row.salary).toBeNull();
    }
  });

  it.each(['employeeCode', 'name', 'email'] as const)('searches %s case-insensitively', async (field) => {
    const fixture = fixtures[10]!;
    const query = parseEmployeeQuery(new URLSearchParams({ q: '  ' + fixture[field].toUpperCase() + '  ', status: 'ALL' }));
    const result = await listEmployees(query);
    expect(result.pagination.total).toBe(1);
    expect(result.data[0]?.employeeCode).toBe(fixture.employeeCode);
  });

  it('fetches every filtered page exactly once in stable order', async () => {
    const codes: string[] = [];
    for (let page = 1; page <= 4; page += 1) {
      const result = await listEmployees(parseEmployeeQuery(new URLSearchParams({
        q: prefix, country: 'BR', status: 'ALL', pageSize: '10', page: String(page), sortBy: 'employeeCode', sortOrder: 'asc',
      })));
      expect(result.pagination).toMatchObject({ page, total: 32, totalPages: 4 });
      expect(result.data).toHaveLength(page === 4 ? 2 : 10);
      expect(result.data.every((row) => row.country === 'BR')).toBe(true);
      codes.push(...result.data.map((row) => row.employeeCode));
    }
    expect(new Set(codes).size).toBe(32);
    expect(codes).toEqual(fixtures.filter((row) => row.country === 'BR').map((row) => row.employeeCode));
  });

  it('returns the matching population even when a requested page is out of range', async () => {
    const result = await listEmployees({ q: prefix, country: 'BR', department: 'Finance', page: 8, pageSize: 25 });
    expect(result.data).toEqual([]);
    expect(result.pagination).toMatchObject({ page: 8, total: 8, totalPages: 1 });
  });
});
