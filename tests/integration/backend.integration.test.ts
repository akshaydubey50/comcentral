import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPrismaClient, getPrisma } from '../../src/server/db/prisma';
import type { PrismaClient } from '../../src/server/generated/prisma/client';
import { changeSalary } from '../../src/server/services/employees';
import { requireIsolatedTestDatabaseUrl } from './test-database';

let prisma: PrismaClient;
let initialized = false;

function suffix(): string {
  return randomUUID().slice(0, 8);
}

describe('PostgreSQL salary invariants', () => {
  beforeAll(() => {
    const testDatabaseUrl = requireIsolatedTestDatabaseUrl();
    process.env.DATABASE_URL = testDatabaseUrl;
    prisma = createPrismaClient(testDatabaseUrl);
    initialized = true;
  });

  afterAll(async () => {
    if (!initialized) return;
    await Promise.all([prisma.$disconnect(), getPrisma().$disconnect()]);
  });

  it('rejects non-positive salary at the database boundary', async () => {
    const key = suffix();
    await expect(
      prisma.employee.create({
        data: {
          employeeCode: 'INVALID-' + key,
          name: 'Invalid Salary',
          email: 'invalid-' + key + '@example.invalid',
          country: 'US',
          department: 'Engineering',
          jobRole: 'Engineer',
          employmentType: 'FULL_TIME',
          joiningDate: new Date('2020-01-01T00:00:00Z'),
          salary: '0',
          currency: 'USD',
        },
      }),
    ).rejects.toThrow();
  });

  it('updates salary and history atomically, rejects stale edits, and rolls back failed audit writes', async () => {
    const key = suffix();
    const user = await prisma.user.create({
      data: {
        id: 'user-' + key,
        name: 'HR Manager',
        email: 'hr-' + key + '@example.invalid',
        emailVerified: true,
      },
    });
    const employee = await prisma.employee.create({
      data: {
        employeeCode: 'EMP-' + key,
        name: 'Salary Test',
        email: 'employee-' + key + '@example.invalid',
        country: 'US',
        department: 'Engineering',
        jobRole: 'Engineer',
        employmentType: 'FULL_TIME',
        joiningDate: new Date('2020-01-01T00:00:00Z'),
        salary: '100000.00',
        currency: 'USD',
      },
    });
    const actor = { id: user.id, name: user.name, email: user.email };

    const changed = await changeSalary(
      employee.id,
      {
        salary: '110000.00',
        currency: 'USD',
        reason: 'Annual review',
        version: employee.version,
      },
      actor,
    );
    expect(changed).toMatchObject({ salary: '110000.00', version: employee.version + 1 });

    const history = await prisma.salaryHistory.findMany({ where: { employeeId: employee.id } });
    expect(history).toHaveLength(1);
    expect(history[0]?.previousSalary.toFixed(2)).toBe('100000.00');
    expect(history[0]?.salary.toFixed(2)).toBe('110000.00');

    await expect(
      changeSalary(
        employee.id,
        {
          salary: '120000.00',
          currency: 'USD',
          reason: 'Stale edit',
          version: employee.version,
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });

    await expect(
      changeSalary(
        employee.id,
        {
          salary: '120000.00',
          currency: 'USD',
          reason: 'Audit actor must exist',
          version: changed.version,
        },
        { id: 'missing-user', name: 'Missing', email: 'missing@example.invalid' },
      ),
    ).rejects.toThrow();

    const afterRollback = await prisma.employee.findUniqueOrThrow({ where: { id: employee.id } });
    expect(afterRollback.salary.toFixed(2)).toBe('110000.00');
    expect(afterRollback.version).toBe(changed.version);
    expect(await prisma.salaryHistory.count({ where: { employeeId: employee.id } })).toBe(1);
  });

  it('allows only one of two concurrent salary changes at the same version', async () => {
    const key = suffix();
    const user = await prisma.user.create({
      data: {
        id: 'concurrent-user-' + key,
        name: 'HR Manager',
        email: 'concurrent-hr-' + key + '@example.invalid',
        emailVerified: true,
      },
    });
    const employee = await prisma.employee.create({
      data: {
        employeeCode: 'CONCUR-' + key,
        name: 'Concurrent Salary Test',
        email: 'concurrent-employee-' + key + '@example.invalid',
        country: 'US',
        department: 'Engineering',
        jobRole: 'Engineer',
        employmentType: 'FULL_TIME',
        joiningDate: new Date('2020-01-01T00:00:00Z'),
        salary: '100000.00',
        currency: 'USD',
      },
    });
    const actor = { id: user.id, name: user.name, email: user.email };
    const results = await Promise.allSettled([
      changeSalary(
        employee.id,
        {
          salary: '110000.00',
          currency: 'USD',
          reason: 'Concurrent A',
          version: employee.version,
        },
        actor,
      ),
      changeSalary(
        employee.id,
        {
          salary: '120000.00',
          currency: 'USD',
          reason: 'Concurrent B',
          version: employee.version,
        },
        actor,
      ),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({ reason: { code: 'VERSION_CONFLICT' } });
    expect(await prisma.salaryHistory.count({ where: { employeeId: employee.id } })).toBe(1);
  });

  it('rejects a guessed future version before salary compare-and-swap', async () => {
    const key = suffix();
    const user = await prisma.user.create({
      data: {
        id: 'future-user-' + key,
        name: 'HR Manager',
        email: 'future-hr-' + key + '@example.invalid',
        emailVerified: true,
      },
    });
    const employee = await prisma.employee.create({
      data: {
        employeeCode: 'FUTURE-' + key,
        name: 'Future Version Test',
        email: 'future-employee-' + key + '@example.invalid',
        country: 'US',
        department: 'Engineering',
        jobRole: 'Engineer',
        employmentType: 'FULL_TIME',
        joiningDate: new Date('2020-01-01T00:00:00Z'),
        salary: '100000.00',
        currency: 'USD',
      },
    });

    await expect(
      changeSalary(
        employee.id,
        {
          salary: '120000.00',
          currency: 'USD',
          reason: 'Guessed future version',
          version: employee.version + 1,
        },
        { id: user.id, name: user.name, email: user.email },
      ),
    ).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });

    const unchanged = await prisma.employee.findUniqueOrThrow({ where: { id: employee.id } });
    expect(unchanged.salary.toFixed(2)).toBe('100000.00');
    expect(await prisma.salaryHistory.count({ where: { employeeId: employee.id } })).toBe(0);
  });

  it('makes salary history immutable in PostgreSQL', async () => {
    const key = suffix();
    const user = await prisma.user.create({
      data: {
        id: 'immutable-user-' + key,
        name: 'HR Manager',
        email: 'immutable-hr-' + key + '@example.invalid',
        emailVerified: true,
      },
    });
    const employee = await prisma.employee.create({
      data: {
        employeeCode: 'IMMUT-' + key,
        name: 'Immutable Audit Test',
        email: 'immutable-employee-' + key + '@example.invalid',
        country: 'US',
        department: 'Finance',
        jobRole: 'Analyst',
        employmentType: 'FULL_TIME',
        joiningDate: new Date('2020-01-01T00:00:00Z'),
        salary: '80000.00',
        currency: 'USD',
      },
    });
    const history = await prisma.salaryHistory.create({
      data: {
        employeeId: employee.id,
        previousSalary: '75000.00',
        previousCurrency: 'USD',
        salary: '80000.00',
        currency: 'USD',
        reason: 'Annual review',
        actorId: user.id,
        actorName: user.name,
        actorEmail: user.email,
      },
    });

    await expect(
      prisma.salaryHistory.update({
        where: { id: history.id },
        data: { reason: 'Tampered reason' },
      }),
    ).rejects.toThrow(/immutable/i);
  });
});
