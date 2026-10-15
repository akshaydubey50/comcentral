import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { getPrisma } from '../../src/server/db/prisma';
import type { PrismaClient } from '../../src/server/generated/prisma/client';
import { archiveEmployee, changeSalary, getEmployee, getSalaryHistory, listEmployees } from '../../src/server/services/employees';
import { commitImport, exportEmployees, previewImport } from '../../src/server/services/imports';
import { getInsights } from '../../src/server/services/insights';
import { requireIsolatedTestDatabaseUrl } from './test-database';

const NOW = new Date('2026-10-15T12:00:00Z');
let prisma: PrismaClient | undefined;

function draftData() {
  const id = randomUUID();
  return {
    employeeCode: 'DRAFT-' + id.slice(0, 8), name: 'Draft Employee', email: id + '@example.invalid',
    country: 'BR', department: 'Draft ' + id, jobRole: 'Analyst', employmentType: 'INTERN' as const,
    joiningDate: new Date('2020-01-01T00:00:00Z'), salary: null, currency: 'BRL' as const,
  };
}

async function actor() {
  const id = randomUUID();
  return prisma!.user.create({ data: { id, name: 'Draft HR', email: id + '@example.invalid' } });
}

describe.sequential('salary-pending imports and first salary assignment', () => {
  beforeAll(() => {
    const url = requireIsolatedTestDatabaseUrl();
    vi.stubEnv('DATABASE_URL', url);
    prisma = getPrisma();
  });
  afterAll(async () => {
    await prisma?.$disconnect();
    vi.unstubAllEnvs();
  });

  it('imports source ids without salaries, returns drafts in the directory, and exports blank pay', async () => {
    const key = randomUUID().slice(0, 8);
    const hr = await actor();
    const csv = [
      'id,fullName,email,jobTitle,department,country,currency,employmentType,hireDate',
      `DRAFT-${key}-FR,France Intern,fr-${key}@example.invalid,Analyst,Draft-${key},FR,EUR,INTERN,2020-01-01`,
      `DRAFT-${key}-BR,Brazil Intern,br-${key}@example.invalid,Analyst,Draft-${key},BR,BRL,INTERN,2020-01-01`,
    ].join('\n');
    const preview = await previewImport(csv, NOW);
    expect(preview).toMatchObject({ valid: true, totalRows: 2, salaryPendingCount: 2, errorCount: 0 });
    await expect(commitImport(csv, preview.previewHash, hr, NOW)).resolves.toEqual({ imported: 2 });
    const directory = await listEmployees({ department: 'Draft-' + key });
    expect(directory.pagination.total).toBe(2);
    expect(directory.data.every((employee) => employee.salary === null && employee.status === 'ACTIVE')).toBe(true);
    expect(directory.data.map(({ country, currency }) => ({ country, currency }))).toEqual([
      { country: 'BR', currency: 'BRL' }, { country: 'FR', currency: 'EUR' },
    ]);
    expect((await getEmployee(directory.data[0]!.id)).salary).toBeNull();
    expect(await prisma!.salaryHistory.count({
      where: { employee: { department: 'Draft-' + key } },
    })).toBe(0);
    const exported = await exportEmployees({ department: 'Draft-' + key });
    expect(exported).toContain('2020-01-01,,BRL');
    expect(exported).toContain('2020-01-01,,EUR');
  });

  it('counts pending employees without treating them as zero pay or outlier cohort members', async () => {
    const pending = draftData();
    await prisma!.employee.createMany({ data: [pending, {
      ...pending, employeeCode: pending.employeeCode + '-PAID', email: 'paid-' + pending.email, salary: '12345.67',
    }] });
    const report = await getInsights({ department: pending.department, groupBy: 'department' }, NOW);
    expect(report).toMatchObject({ headcount: 2, salaryPendingCount: 1, reportingAvailable: true });
    expect(report.summaries).toEqual([expect.objectContaining({ currency: 'BRL', count: 1, total: '12345.67', average: '12345.67', median: '12345.67' })]);
    expect(report.groups).toEqual([expect.objectContaining({ count: 1, total: '12345.67' })]);
    expect(report.bands.reduce((count, band) => count + band.count, 0)).toBe(1);
    expect(report.tenure.reduce((count, group) => count + group.count, 0)).toBe(1);
    expect(report.outliers.cohorts).toEqual([expect.objectContaining({ count: 1, state: 'INSUFFICIENT_DATA' })]);
  });

  it('audits the first salary with null previous pay and rolls back a failed audit', async () => {
    const employee = await prisma!.employee.create({ data: draftData() });
    const hr = await actor();
    const input = { salary: '12345.67', currency: 'BRL' as const, reason: 'Initial salary confirmed', version: employee.version };
    await expect(changeSalary(employee.id, input, { ...hr, id: 'missing-draft-actor' })).rejects.toThrow();
    expect(await getEmployee(employee.id)).toMatchObject({ salary: null, version: employee.version });
    expect(await getSalaryHistory(employee.id)).toEqual([]);

    const saved = await changeSalary(employee.id, input, hr);
    expect(saved).toMatchObject({ salary: '12345.67', version: employee.version + 1 });
    const history = await getSalaryHistory(employee.id);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ previousSalary: null, previousCurrency: 'BRL', salary: '12345.67', reason: input.reason,
      actor: { id: hr.id, name: hr.name, email: hr.email } });
    await expect(changeSalary(employee.id, { ...input, salary: '13000.00' }, hr))
      .rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await expect(prisma!.salaryHistory.update({ where: { id: history[0]!.id }, data: { reason: 'Altered' } }))
      .rejects.toThrow(/immutable/i);
    const archived = await archiveEmployee(employee.id, saved.version, true);
    await expect(changeSalary(employee.id, { ...input, salary: '13000.00', version: archived.version }, hr))
      .rejects.toMatchObject({ code: 'EMPLOYEE_ARCHIVED' });
  });

  it('allows exactly one concurrent first-salary assignment and one history entry', async () => {
    const employee = await prisma!.employee.create({ data: draftData() });
    const hr = await actor();
    const results = await Promise.allSettled(['100.00', '200.00'].map((salary) => changeSalary(employee.id, {
      salary, currency: 'BRL', reason: 'Initial pay', version: employee.version,
    }, hr)));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toEqual([
      expect.objectContaining({ reason: expect.objectContaining({ code: 'VERSION_CONFLICT' }) }),
    ]);
    const history = await getSalaryHistory(employee.id);
    expect(history).toHaveLength(1);
    expect(history[0]!.previousSalary).toBeNull();
    expect((await getEmployee(employee.id)).salary).toBe(history[0]!.salary);
  });

  it('preserves non-null salary constraints for drafts and first-history records', async () => {
    for (const salary of ['0', '-1']) {
      await expect(prisma!.employee.create({ data: { ...draftData(), salary } })).rejects.toThrow();
    }
    await expect(prisma!.employee.create({ data: { ...draftData(), currency: 'JPY', salary: '100.01' } })).rejects.toThrow();
    const employee = await prisma!.employee.create({ data: draftData() });
    const hr = await actor();
    await expect(prisma!.salaryHistory.create({ data: {
      employeeId: employee.id, previousSalary: null, previousCurrency: 'BRL', salary: '0', currency: 'BRL',
      reason: 'Invalid first pay', actorId: hr.id, actorName: hr.name, actorEmail: hr.email,
    } })).rejects.toThrow();
    expect(await getSalaryHistory(employee.id)).toEqual([]);
  });
});
