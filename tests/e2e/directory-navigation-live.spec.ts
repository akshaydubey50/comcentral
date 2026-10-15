import { randomUUID } from 'node:crypto';
import { test, expect } from './live-session';
import type { Page } from './browser-fixture';
import { requireLocalBrowserTestTarget } from './test-target';
import { createPrismaClient } from '../../src/server/db/prisma';
import type { PrismaClient } from '../../src/server/generated/prisma/client';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });
const prefix = 'PAGE-LIVE-' + randomUUID().slice(0, 8);
let prisma: PrismaClient | undefined;
const fixtures: Array<{
  employeeCode: string; name: string; email: string; country: string; department: string; jobRole: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN'; status: 'ACTIVE' | 'ARCHIVED';
  joiningDate: Date; salary: string | null; currency: 'USD' | 'BRL';
}> = [];
for (const country of ['US', 'BR'] as const) {
  for (const department of ['Engineering', 'Finance']) {
    for (const jobRole of ['Analyst', 'Manager']) {
      for (const employmentType of ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'] as const) {
        for (const status of ['ACTIVE', 'ARCHIVED'] as const) {
          const sequence = String(fixtures.length + 1).padStart(2, '0');
          fixtures.push({ employeeCode: prefix + '-' + sequence, name: prefix + ' Person ' + sequence,
            email: prefix.toLowerCase() + '-' + sequence + '@example.invalid', country, department, jobRole,
            employmentType, status, joiningDate: new Date('2020-01-01T00:00:00Z'),
            salary: employmentType === 'INTERN' ? null : '12345.67', currency: country === 'BR' ? 'BRL' : 'USD' });
        }
      }
    }
  }
}

test.beforeAll(async () => {
  requireLocalBrowserTestTarget();
  prisma = createPrismaClient(process.env.DATABASE_URL!);
  await prisma.employee.createMany({ data: fixtures });
});
test.afterAll(async () => {
  if (prisma) {
    await prisma.employee.deleteMany({ where: { employeeCode: { startsWith: prefix } } });
    await prisma.$disconnect();
  }
});
async function select(page: Page, label: string, value: string) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: value, exact: true }).click();
}

async function verifyQuery(page: Page, expected: Record<string, string>, count: number) {
  await expect.poll(() => Object.entries(expected).every(([key, value]) => new URL(page.url()).searchParams.get(key) === value)).toBe(true);
  await expect(page.getByText(count.toLocaleString() + ' matching records', { exact: true })).toBeVisible();
  const response = await page.request.get('/api/employees' + new URL(page.url()).search);
  expect(response.status()).toBe(200);
  const result = await response.json();
  expect(result.pagination.total).toBe(count);
  for (const employee of result.data) {
    for (const key of ['country', 'department', 'jobRole', 'employmentType', 'status']) {
      if (expected[key] && expected[key] !== 'ALL') expect(employee[key]).toBe(expected[key]);
    }
  }
  return result;
}

test('all filters and First Previous Next Last navigate real matching records', async ({ page }) => {
  test.setTimeout(90_000);
  const unfiltered = await page.request.get('/api/employees?status=ACTIVE&pageSize=1');
  expect(unfiltered.status()).toBe(200);
  const unfilteredActiveCount = (await unfiltered.json()).pagination.total;
  await page.goto(`/employees?q=${prefix}&status=ALL&pageSize=10&sortBy=employeeCode&sortOrder=asc`);
  const table = page.getByRole('table', { name: 'Employee directory', exact: true });
  await verifyQuery(page, { q: prefix, status: 'ALL' }, 64);
  await expect(table.getByRole('row')).toHaveCount(11);
  await expect(page.getByRole('button', { name: 'First', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();

  for (const [control, number, rowCount] of [['Next', 2, 10], ['Last', 7, 4], ['Previous', 6, 10], ['First', 1, 10]] as const) {
    await page.getByRole('button', { name: control, exact: true }).click();
    await verifyQuery(page, { q: prefix, status: 'ALL', page: String(number), sortBy: 'employeeCode' }, 64);
    await expect(page.getByText(`Page ${number} of 7`, { exact: true })).toBeVisible();
    await expect(table.getByRole('row')).toHaveCount(rowCount + 1);
    await expect(table.getByRole('row').filter({ hasText: fixtures[(number - 1) * 10]!.employeeCode })).toBeVisible();
    if (number === 7) {
      await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Last', exact: true })).toBeDisabled();
    }
  }
  await page.goBack();
  await expect(page.getByText('Page 6 of 7', { exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByText('Page 1 of 7', { exact: true })).toBeVisible();

  const checks = [
    ['Country', 'Brazil', 'country', 'BR', 32], ['Country', 'All countries', 'country', '', 64],
    ['Department', 'Finance', 'department', 'Finance', 32], ['Department', 'All departments', 'department', '', 64],
    ['Job role', 'Manager', 'jobRole', 'Manager', 32], ['Job role', 'All roles', 'jobRole', '', 64],
    ['Employment type', 'Intern', 'employmentType', 'INTERN', 16], ['Employment type', 'All types', 'employmentType', '', 64],
    ['Status', 'Archived', 'status', 'ARCHIVED', 32], ['Status', 'All', 'status', 'ALL', 64],
  ] as const;
  for (const [label, value, key, queryValue, count] of checks) {
    await select(page, label, value);
    await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
    const result = await verifyQuery(page, { q: prefix, page: '1', status: key === 'status' ? queryValue : 'ALL', ...(queryValue ? { [key]: queryValue } : {}) }, count);
    if (!queryValue) expect(new URL(page.url()).searchParams.has(key)).toBe(false);
    await expect(table.getByRole('row').filter({ hasText: result.data[0].employeeCode })).toBeVisible();
  }

  await page.getByRole('button', { name: 'Last', exact: true }).click();
  await expect(page.getByText('Page 7 of 7', { exact: true })).toBeVisible();
  await page.getByLabel('Search employees').fill(fixtures[10]!.name);
  await page.getByLabel('Search employees').press('Enter');
  await verifyQuery(page, { q: fixtures[10]!.name, page: '1' }, 1);
  await expect(table.getByRole('row').filter({ hasText: fixtures[10]!.employeeCode })).toBeVisible();

  await page.getByLabel('Search employees').fill(prefix);
  await select(page, 'Country', 'Brazil');
  await select(page, 'Department', 'Finance');
  await select(page, 'Job role', 'Manager');
  await select(page, 'Employment type', 'Intern');
  await select(page, 'Status', 'Archived');
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await verifyQuery(page, { q: prefix, country: 'BR', department: 'Finance', jobRole: 'Manager', employmentType: 'INTERN', status: 'ARCHIVED', page: '1' }, 1);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Country', exact: true })).toHaveText('Brazil');
  await expect(page.getByRole('combobox', { name: 'Employment type', exact: true })).toHaveText('Intern');
  await expect(table.getByText(/^Salary pending(?: \(BRL\))?$/)).toBeVisible();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await verifyQuery(page, { status: 'ACTIVE', page: '1' }, unfilteredActiveCount);
  for (const key of ['q', 'country', 'department', 'jobRole', 'employmentType']) expect(new URL(page.url()).searchParams.has(key)).toBe(false);
});

test('mobile directory recovers a stale page without losing selected filters', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/employees?q=${prefix}&country=BR&department=Finance&jobRole=Manager&employmentType=INTERN&status=ALL&page=99`);
  await expect(page.getByRole('button', { name: 'Go to first page', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No employees found', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Go to first page', exact: true }).click();
  await verifyQuery(page, { q: prefix, country: 'BR', department: 'Finance', jobRole: 'Manager', employmentType: 'INTERN', status: 'ALL', page: '1' }, 2);
  await expect(page.getByRole('combobox', { name: 'Country', exact: true })).toHaveText('Brazil');
  await expect(page.getByRole('button', { name: 'First', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Last', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
