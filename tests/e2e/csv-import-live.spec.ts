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
  await upload('missing-salary.csv', [
    'id,fullName,email,jobTitle,department,country,currency,employmentType,hireDate',
    `${employeeCode},CSV Verified Employee,${email},Analyst,Quality,US,USD,FULL_TIME,2020-02-29`,
  ].join('\n'));
  await expect(validate).toBeEnabled();
  await validate.click();
  await expect(page.getByText('Missing required column "employeeCode".', { exact: true })).toBeVisible();
  await expect(page.getByText('Missing required column "salary".', { exact: true })).toBeVisible();
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
