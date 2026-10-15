import { randomUUID } from 'node:crypto';
import { test, expect } from './browser-fixture';
import { requireLocalBrowserTestTarget } from './test-target';

// This journey uses real test credentials and cookies; retain no request artifacts.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.beforeAll(() => requireLocalBrowserTestTarget());

test('HR corrects an incompatible CSV, previews aliases and saves exact values to the database', async ({ page }) => {
  const suffix = randomUUID().slice(0, 8);
  const employeeCode = 'CSV-LIVE-' + suffix;
  const email = 'employee-' + suffix + '@example.test';
  const origin = process.env.E2E_BASE_URL || 'http://localhost:3000';
  const signup = await page.request.post('/api/auth/sign-up/email', {
    headers: { Origin: origin },
    data: { name: 'CSV Verification HR', email: 'hr-' + suffix + '@example.test', password: randomUUID() },
  });
  expect(signup.status()).toBe(200);
  await page.goto('/imports');

  const input = page.locator('input[type="file"]');
  const validate = page.getByRole('button', { name: 'Validate and preview' });
  const upload = (name: string, text: string) => input.setInputFiles({
    name, mimeType: 'text/csv', buffer: Buffer.from(text),
  });
  await upload('missing-email.csv', [
    'id,fullName,jobTitle,department,country,currency,employmentType,hireDate',
    `${employeeCode},CSV Verified Employee,Analyst,Quality,US,USD,FULL_TIME,2020-02-29`,
  ].join('\n'));
  await expect(validate).toBeEnabled();
  await validate.click();
  await expect(page.getByText('Missing required column "email".', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Confirm and import/ })).toBeDisabled();
  const before = await page.request.get('/api/employees?q=' + employeeCode + '&status=ALL');
  expect(before.status()).toBe(200);
  expect((await before.json()).pagination.total).toBe(0);

  await upload('corrected-aliases.csv', '\uFEFF' + [
    'salary,currency,hireDate,employmentType,jobTitle,department,country,email,fullName,employeeCode',
    `12345.67,USD,2020-02-29,FULL_TIME,Analyst,Quality,US,${email},CSV Verified Employee,${employeeCode}`,
  ].join('\n'));
  await expect(page.getByRole('button', { name: /Confirm and import/ })).toHaveCount(0);
  await expect(validate).toBeEnabled();
  await validate.click();
  const preview = page.getByRole('table', { name: 'Employee import preview' });
  await expect(preview.getByRole('row').filter({ hasText: employeeCode })).toBeVisible();
  await expect(preview.getByText('USD 12,345.67', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm and import 1 employees' }).click();
  await expect(page.getByRole('heading', { name: 'Import complete' })).toBeVisible();

  const saved = await page.request.get('/api/employees?q=' + employeeCode + '&status=ALL');
  expect(saved.status()).toBe(200);
  const result = await saved.json();
  expect(result.pagination.total).toBe(1);
  expect(result.data).toHaveLength(1);
  expect(result.data[0]).toMatchObject({
    employeeCode, name: 'CSV Verified Employee', email, country: 'US', department: 'Quality',
    jobRole: 'Analyst', employmentType: 'FULL_TIME', joiningDate: '2020-02-29',
    salary: '12345.67', currency: 'USD', status: 'ACTIVE',
  });
  await page.goto('/employees?q=' + employeeCode);
  await page.reload();
  await expect(page.getByRole('row').filter({ hasText: employeeCode })).toBeVisible();
});

test('HR imports all 10000 salary-pending employees and reads them after reload', async ({ page }) => {
  test.setTimeout(120_000);
  const prefix = 'DRAFT-' + randomUUID().slice(0, 8) + '-';
  const origin = process.env.E2E_BASE_URL || 'http://localhost:3000';
  const signup = await page.request.post('/api/auth/sign-up/email', {
    headers: { Origin: origin },
    data: { name: 'Draft Import HR', email: prefix.toLowerCase() + 'hr@example.test', password: randomUUID() },
  });
  expect(signup.status()).toBe(200);
  const rows = Array.from({ length: 10_000 }, (_, index) => {
    const code = prefix + String(index + 1).padStart(5, '0');
    const [country, currency] = index % 2 === 0 ? ['BR', 'BRL'] : ['FR', 'EUR'];
    return `${code},Draft Employee ${index + 1},${code.toLowerCase()}@example.test,Analyst,CSV Quality,${country},${currency},INTERN,2020-02-29`;
  });
  const csvText = ['id,fullName,email,jobTitle,department,country,currency,employmentType,hireDate', ...rows].join('\n');
  await page.goto('/imports');
  await page.locator('input[type="file"]').setInputFiles({
    name: '10000-draft-employees.csv', mimeType: 'text/csv', buffer: Buffer.from(csvText),
  });
  const validate = page.getByRole('button', { name: 'Validate and preview' });
  await expect(validate).toBeEnabled();
  const previewResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/imports/preview');
  await validate.click();
  const preview = await previewResponse;
  expect(preview.status()).toBe(200);
  expect((await preview.json()).data).toMatchObject({ valid: true, totalRows: 10_000, salaryPendingCount: 10_000, errorCount: 0 });
  await expect(page.getByRole('table', { name: 'Employee import preview' }).getByText('Salary pending', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Confirm and import 10,000 employees' }).click();
  await expect(page.getByRole('heading', { name: 'Import complete' })).toBeVisible({ timeout: 30_000 });

  // Read every page back; the server's reported count alone cannot prove all rows are retrievable.
  const seen = new Set<string>();
  let firstId = '';
  for (let pageNumber = 1; pageNumber <= 100; pageNumber += 1) {
    const response = await page.request.get(`/api/employees?q=${prefix}&pageSize=100&page=${pageNumber}&sortBy=employeeCode&sortOrder=asc`);
    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.pagination.total).toBe(10_000);
    expect(result.data).toHaveLength(100);
    for (const employee of result.data) {
      expect(employee.salary).toBeNull();
      expect(employee.employmentType).toBe('INTERN');
      expect(employee.employeeCode.startsWith(prefix)).toBe(true);
      seen.add(employee.employeeCode);
      if (employee.employeeCode === prefix + '00001') firstId = employee.id;
    }
  }
  expect(seen.size).toBe(10_000);
  expect(seen.has(prefix + '00001')).toBe(true);
  expect(seen.has(prefix + '10000')).toBe(true);
  await page.goto('/employees?q=' + prefix);
  await page.reload();
  const visibleRow = page.getByRole('row').filter({ hasText: prefix + '00001' });
  await expect(visibleRow).toBeVisible();
  await expect(visibleRow.getByText('Salary pending', { exact: true })).toBeVisible();

  const insightResponse = await page.request.get('/api/insights?q=' + prefix);
  expect(insightResponse.status()).toBe(200);
  expect((await insightResponse.json()).data).toMatchObject({ headcount: 10_000, salaryPendingCount: 10_000, summaries: [] });
  expect(firstId).not.toBe('');
  await page.goto('/employees/' + firstId);
  await page.getByRole('button', { name: 'Add salary', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'New annual base salary', exact: true }).fill('12345.67');
  await dialog.getByLabel('Reason for change').fill('Initial salary supplied by HR');
  await dialog.getByRole('button', { name: /Apply salary change|Add salary/ }).click();
  await expect(dialog).toHaveCount(0);
  const record = await page.request.get('/api/employees/' + firstId);
  expect((await record.json()).data).toMatchObject({ salary: '12345.67', currency: 'BRL', version: 2 });
  const history = await page.request.get('/api/employees/' + firstId + '/history');
  expect((await history.json()).data).toEqual([expect.objectContaining({ previousSalary: null, salary: '12345.67', reason: 'Initial salary supplied by HR' })]);
});
