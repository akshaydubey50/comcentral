import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { EmployeeInput, EmployeeUpdate, HrUser } from '../../src/shared/contracts';
import { createPrismaClient, getPrisma } from '../../src/server/db/prisma';
import type { PrismaClient } from '../../src/server/generated/prisma/client';
import {
  archiveEmployee,
  changeSalary,
  createEmployee,
  getSalaryHistory,
  listEmployees,
  updateEmployee,
} from '../../src/server/services/employees';
import { exportEmployees } from '../../src/server/services/imports';
import { requireIsolatedTestDatabaseUrl } from './test-database';

const CLEAN_CODE_PREFIX = 'B02-CLEAN-';
const CLEAN_EMAIL_PREFIX = 'b02-clean-';
const INITIAL_CREATE_REASON = 'Initial salary recorded at employee creation';
const creationActor: HrUser = {
  id: `b02-creation-user-${randomUUID()}`,
  name: 'B02 Creation Actor',
  email: `b02-creation-${randomUUID()}@example.invalid`,
};

let prisma: PrismaClient;
let initialized = false;

function key(): string {
  return randomUUID().slice(0, 8);
}

function employeeInput(testKey: string, overrides: Partial<EmployeeInput> = {}): EmployeeInput {
  return {
    employeeCode: `${CLEAN_CODE_PREFIX}${testKey}`,
    name: 'B02 Employee',
    email: `${CLEAN_EMAIL_PREFIX}${testKey}@example.invalid`,
    country: 'US',
    department: 'Engineering',
    jobRole: 'Engineer',
    employmentType: 'FULL_TIME',
    joiningDate: '2020-01-15',
    salary: '100000.00',
    currency: 'USD',
    ...overrides,
  };
}

async function removeDisposableFixtures(): Promise<void> {
  await prisma.employee.deleteMany({
    where: {
      histories: { none: {} },
      OR: [
        { employeeCode: { startsWith: CLEAN_CODE_PREFIX } },
        { email: { startsWith: CLEAN_EMAIL_PREFIX } },
      ],
    },
  });
  await prisma.user.deleteMany({
    where: {
      salaryHistories: { none: {} },
      OR: [
        { id: { startsWith: 'b02-clean-' } },
        { email: { startsWith: CLEAN_EMAIL_PREFIX } },
      ],
    },
  });
}

describe.sequential('employee persistence', () => {
  beforeAll(async () => {
    const testDatabaseUrl = requireIsolatedTestDatabaseUrl();
    vi.stubEnv('DATABASE_URL', testDatabaseUrl);
    prisma = createPrismaClient(testDatabaseUrl);
    initialized = true;
    await removeDisposableFixtures();
    await prisma.user.create({ data: { ...creationActor, emailVerified: true } });
  });

  afterEach(async () => {
    if (!initialized) return;
    await removeDisposableFixtures();
  });

  afterAll(async () => {
    if (!initialized) return;
    await Promise.all([prisma.$disconnect(), getPrisma().$disconnect()]);
    vi.unstubAllEnvs();
  });

  it('rejects a stale metadata write without replacing the committed update', async () => {
    const testKey = key();
    const created = await createEmployee(employeeInput(testKey), creationActor);
    const firstUpdate: EmployeeUpdate = {
      employeeCode: created.employeeCode,
      name: 'Committed Metadata',
      email: created.email,
      country: created.country,
      department: 'Platform',
      jobRole: created.jobRole,
      employmentType: created.employmentType,
      joiningDate: created.joiningDate,
      version: created.version,
    };
    const committed = await updateEmployee(created.id, firstUpdate);

    await expect(updateEmployee(created.id, {
      ...firstUpdate,
      name: 'Stale Metadata',
      department: 'Finance',
    })).rejects.toMatchObject({ status: 409, code: 'VERSION_CONFLICT' });

    const stored = await prisma.employee.findUniqueOrThrow({ where: { id: created.id } });
    expect(stored).toMatchObject({
      name: 'Committed Metadata',
      department: 'Platform',
      version: committed.version,
      currency: 'USD',
    });
    expect(stored.salary?.toFixed(2)).toBe('100000.00');
    expect(await getSalaryHistory(created.id)).toEqual([
      expect.objectContaining({
        previousSalary: null,
        previousCurrency: 'USD',
        salary: '100000.00',
        currency: 'USD',
        reason: INITIAL_CREATE_REASON,
        actor: creationActor,
      }),
    ]);
  });

  it('rolls back manual creation when its initial provenance cannot be recorded', async () => {
    const testKey = key();
    const input = employeeInput(testKey, {
      employeeCode: `B02-ROLLBACK-${testKey}`,
      email: `b02-rollback-${testKey}@example.invalid`,
    });

    await expect(createEmployee(input, {
      ...creationActor,
      id: `missing-b02-creation-user-${testKey}`,
    })).rejects.toThrow();

    expect(await prisma.employee.count({ where: { employeeCode: input.employeeCode } })).toBe(0);
  });

  it('preserves salary history through archive and restore and blocks archived salary changes', async () => {
    const testKey = key();
    const actor: HrUser = {
      id: `b02-history-user-${testKey}`,
      name: 'B02 History Actor',
      email: `b02-history-user-${testKey}@example.invalid`,
    };
    await prisma.user.create({
      data: { ...actor, emailVerified: true },
    });
    const created = await createEmployee({
      ...employeeInput(testKey),
      employeeCode: `B02-HISTORY-${testKey}`,
      email: `b02-history-${testKey}@example.invalid`,
    }, actor);
    const changed = await changeSalary(created.id, {
      salary: '110000.25',
      currency: 'USD',
      reason: 'B02 archive persistence',
      version: created.version,
    }, actor);
    const historyBeforeArchive = await getSalaryHistory(created.id);

    const archived = await archiveEmployee(created.id, changed.version, true);
    expect(archived).toMatchObject({ status: 'ARCHIVED', version: changed.version + 1 });
    expect((await listEmployees({ q: created.employeeCode })).pagination.total).toBe(0);
    expect((await listEmployees({ q: created.employeeCode, status: 'ARCHIVED' })).data)
      .toEqual([expect.objectContaining({ id: created.id, status: 'ARCHIVED' })]);
    await expect(changeSalary(created.id, {
      salary: '120000.25',
      currency: 'USD',
      reason: 'Must not apply while archived',
      version: archived.version,
    }, actor)).rejects.toMatchObject({ status: 409, code: 'EMPLOYEE_ARCHIVED' });
    expect(await getSalaryHistory(created.id)).toEqual(historyBeforeArchive);

    const restored = await archiveEmployee(created.id, archived.version, false);
    expect(restored).toMatchObject({ status: 'ACTIVE', version: archived.version + 1 });
    expect((await listEmployees({ q: created.employeeCode })).data)
      .toEqual([expect.objectContaining({ id: created.id, status: 'ACTIVE' })]);
    expect(await getSalaryHistory(created.id)).toEqual(historyBeforeArchive);
    expect(historyBeforeArchive).toHaveLength(2);
    expect(historyBeforeArchive).toEqual(expect.arrayContaining([
      expect.objectContaining({
        previousSalary: '100000.00',
        salary: '110000.25',
        reason: 'B02 archive persistence',
        actor,
      }),
      expect.objectContaining({
        previousSalary: null,
        salary: '100000.00',
        reason: INITIAL_CREATE_REASON,
        actor,
      }),
    ]));
  });

  it('keeps filtered tied pages stable and exports every match with exact safe cells', async () => {
    const testKey = key();
    const department = `B02 Filter ${testKey}`;
    const base = {
      name: 'B02 Stable Employee',
      country: 'US',
      department,
      employmentType: 'CONTRACT' as const,
      joiningDate: new Date('2020-01-15T00:00:00.000Z'),
      status: 'ACTIVE' as const,
    };
    const matching = [
      {
        id: `b02-clean-${testKey}-a`,
        employeeCode: `${CLEAN_CODE_PREFIX}${testKey}-A`,
        email: `${CLEAN_EMAIL_PREFIX}${testKey}-a@example.invalid`,
        jobRole: '=HYPERLINK("https://example.invalid","Open")',
        salary: '12345.60',
        currency: 'USD' as const,
      },
      {
        id: `b02-clean-${testKey}-b`,
        employeeCode: `${CLEAN_CODE_PREFIX}${testKey}-B`,
        email: `${CLEAN_EMAIL_PREFIX}${testKey}-b@example.invalid`,
        jobRole: 'Analyst',
        salary: '7654321',
        currency: 'JPY' as const,
      },
      {
        id: `b02-clean-${testKey}-c`,
        employeeCode: `${CLEAN_CODE_PREFIX}${testKey}-C`,
        email: `${CLEAN_EMAIL_PREFIX}${testKey}-c@example.invalid`,
        jobRole: 'Engineer',
        salary: '0.10',
        currency: 'EUR' as const,
      },
      {
        id: `b02-clean-${testKey}-d`,
        employeeCode: `${CLEAN_CODE_PREFIX}${testKey}-D`,
        email: `${CLEAN_EMAIL_PREFIX}${testKey}-d@example.invalid`,
        jobRole: 'Principal',
        salary: '999999999999.99',
        currency: 'USD' as const,
      },
    ];
    await prisma.employee.createMany({
      data: [
        ...matching.map((employee) => ({ ...base, ...employee })),
        {
          ...base,
          id: `b02-clean-${testKey}-archived`,
          employeeCode: `${CLEAN_CODE_PREFIX}${testKey}-ARCHIVED`,
          email: `${CLEAN_EMAIL_PREFIX}${testKey}-archived@example.invalid`,
          jobRole: 'Excluded Archived',
          salary: '50000.00',
          currency: 'USD',
          status: 'ARCHIVED',
        },
        {
          ...base,
          id: `b02-clean-${testKey}-full-time`,
          employeeCode: `${CLEAN_CODE_PREFIX}${testKey}-FULL-TIME`,
          email: `${CLEAN_EMAIL_PREFIX}${testKey}-full-time@example.invalid`,
          jobRole: 'Excluded Type',
          salary: '50000.00',
          currency: 'USD',
          employmentType: 'FULL_TIME',
        },
      ],
    });
    const filters = { department, employmentType: 'CONTRACT' as const, status: 'ACTIVE' as const };

    const firstPage = await listEmployees({
      ...filters,
      page: 1,
      pageSize: 2,
      sortBy: 'name',
      sortOrder: 'asc',
    });
    const secondPage = await listEmployees({
      ...filters,
      page: 2,
      pageSize: 2,
      sortBy: 'name',
      sortOrder: 'asc',
    });
    const repeatedFirstPage = await listEmployees({
      ...filters,
      page: 1,
      pageSize: 2,
      sortBy: 'name',
      sortOrder: 'asc',
    });
    expect(firstPage.pagination).toEqual({ page: 1, pageSize: 2, total: 4, totalPages: 2 });
    expect(firstPage.data.map(({ id }) => id)).toEqual(matching.slice(0, 2).map(({ id }) => id));
    expect(secondPage.data.map(({ id }) => id)).toEqual(matching.slice(2).map(({ id }) => id));
    expect(repeatedFirstPage.data.map(({ id }) => id)).toEqual(firstPage.data.map(({ id }) => id));

    const csv = await exportEmployees(filters);
    const expectedRows = [
      'employeeCode,name,email,country,department,jobRole,employmentType,joiningDate,salary,currency',
      `${matching[0]?.employeeCode},B02 Stable Employee,${matching[0]?.email},US,${department},"'=HYPERLINK(""https://example.invalid"",""Open"")",CONTRACT,2020-01-15,12345.60,USD`,
      `${matching[1]?.employeeCode},B02 Stable Employee,${matching[1]?.email},US,${department},Analyst,CONTRACT,2020-01-15,7654321,JPY`,
      `${matching[2]?.employeeCode},B02 Stable Employee,${matching[2]?.email},US,${department},Engineer,CONTRACT,2020-01-15,0.10,EUR`,
      `${matching[3]?.employeeCode},B02 Stable Employee,${matching[3]?.email},US,${department},Principal,CONTRACT,2020-01-15,999999999999.99,USD`,
    ];
    expect(csv).toBe(`${expectedRows.join('\r\n')}\r\n`);
  });
});
