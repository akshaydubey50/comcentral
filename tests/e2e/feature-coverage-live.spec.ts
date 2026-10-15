import { randomUUID } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import type { Page } from './browser-fixture';
import { expect, test } from './live-session';

// Real synthetic credentials stay out of traces and screenshots.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

/** The guarded shared session fixture authenticates HR; every journey owns a unique prefix. */
function journeyFixture() {
  const prefix = 'COVER-' + randomUUID().slice(0, 8);
  const headers = { Origin: process.env.E2E_BASE_URL || 'http://localhost:3000' };
  const email = process.env.E2E_EMAIL;
  if (!email) throw new Error('Set E2E_EMAIL for the provisioned test HR account.');
  return { prefix, headers, actorEmail: email };
}

/** Seed only this journey through the real validated import endpoint. */
async function importRows(page: Page, headers: Record<string, string>, rows: string[]) {
  const csvText = ['employeeCode,name,email,country,department,jobRole,employmentType,joiningDate,salary,currency', ...rows].join('\n');
  const preview = await page.request.post('/api/imports/preview', { headers, data: { csvText } });
  expect(preview.status()).toBe(200);
  const result = (await preview.json()).data;
  expect(result.valid).toBe(true);
  const committed = await page.request.post('/api/imports/commit', {
    headers, data: { csvText, previewHash: result.previewHash, confirmed: true },
  });
  expect(committed.ok()).toBe(true);
}

test('employee form creates and edits a persisted record and salary history survives reload', async ({ page }) => {
  const { prefix, actorEmail } = journeyFixture();
  await page.goto('/employees?q=' + prefix);
  await page.getByRole('button', { name: 'Add employee', exact: true }).first().click();
  const form = page.getByRole('dialog', { name: 'Add employee', exact: true });
  await form.getByLabel(/^Employee code/).fill(prefix);
  await form.getByLabel(/^Full name/).fill('Coverage Employee');
  await form.getByLabel(/^Work email/).fill(prefix.toLowerCase() + '-employee@example.test');
  await form.getByRole('combobox', { name: /^Country/ }).click();
  await page.getByRole('option', { name: 'United States', exact: true }).click();
  await form.getByLabel(/^Department/).fill('Coverage Quality');
  await form.getByLabel(/^Job role/).fill('Coverage Analyst');
  await form.getByLabel(/^Joining date/).fill('2020-02-29');
  await form.getByLabel(/^Annual base salary/).fill('12345.67');
  const createdResponse = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/employees');
  await form.getByRole('button', { name: 'Add employee', exact: true }).click();
  const created = await createdResponse;
  expect(created.status()).toBe(201);
  const createdEmployee = (await created.json()).data;
  await expect(form).toHaveCount(0);
  await page.reload();
  const row = page.getByRole('table', { name: 'Employee directory', exact: true }).getByRole('row').filter({ hasText: prefix });
  await expect(row).toContainText('USD 12,345.67');
  await row.getByRole('button', { name: 'Edit employee details for Coverage Employee', exact: true }).click();
  const edit = page.getByRole('dialog', { name: 'Edit employee details', exact: true });
  await edit.getByLabel(/^Full name/).fill('Coverage Employee Updated');
  await edit.getByLabel(/^Department/).fill('Coverage Operations');
  const editedResponse = page.waitForResponse((response) => response.request().method() === 'PATCH' && new URL(response.url()).pathname === '/api/employees/' + createdEmployee.id);
  await edit.getByRole('button', { name: 'Save changes', exact: true }).click();
  expect((await editedResponse).status()).toBe(200);
  await expect(edit).toHaveCount(0);
  await expect(row).toContainText('Coverage Operations');
  await row.getByRole('link', { name: 'View employee details for Coverage Employee Updated', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Coverage Employee Updated', exact: true })).toBeVisible();
  await expect(page.getByText('Coverage Operations', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Change salary', exact: true }).click();
  const salary = page.getByRole('dialog');
  await salary.getByLabel(/^New annual base salary/).fill('23456.78');
  await salary.getByLabel('Reason for change').fill('Coverage annual review');
  const changedResponse = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/employees/' + createdEmployee.id + '/salary');
  await salary.getByRole('button', { name: 'Apply salary change', exact: true }).click();
  expect((await changedResponse).status()).toBe(200);
  await expect(salary).toHaveCount(0);
  await page.reload();
  const history = page.getByRole('table', { name: 'Salary change history' });
  await expect(history.getByRole('row')).toHaveCount(3);
  await expect(history).toContainText('Initial salary recorded at employee creation');
  await expect(history).toContainText('USD 12,345.67');
  await expect(history).toContainText('USD 23,456.78');
  await expect(history).toContainText('Coverage annual review');
  await expect(history).toContainText(actorEmail);
  const persisted = await page.request.get('/api/employees?q=' + prefix);
  expect(persisted.status()).toBe(200);
  expect((await persisted.json()).data).toEqual([expect.objectContaining({
    employeeCode: prefix, name: 'Coverage Employee Updated', department: 'Coverage Operations',
    salary: '23456.78', currency: 'USD', version: 3,
  })]);
});

test('directory filters, salary sorting and pagination export every matching row with formula protection', async ({ page }) => {
  const { prefix, headers } = journeyFixture();
  const rows = Array.from({ length: 27 }, (_, index) => {
    const number = index + 1;
    const code = prefix + '-' + String(number).padStart(2, '0');
    const name = number === 1 ? '=Coverage Formula' : 'Coverage Person ' + number;
    return `${code},${name},${code.toLowerCase()}@example.test,${number === 27 ? 'CA' : 'US'},${prefix},Analyst,FULL_TIME,2020-02-29,${10000 + number}.00,USD`;
  });
  await importRows(page, headers, rows);
  await page.goto('/employees');
  await page.getByLabel('Search employees').fill(prefix);
  await page.getByRole('combobox', { name: 'Country', exact: true }).click();
  await page.getByRole('option', { name: 'United States', exact: true }).click();
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(page.getByText('26 matching records', { exact: true })).toBeVisible();
  const table = page.getByRole('table', { name: 'Employee directory', exact: true });
  await expect(table.getByRole('row')).toHaveCount(26);
  await table.getByRole('button', { name: 'Annual salary', exact: true }).click();
  await expect(page).toHaveURL(/sortBy=salary/);
  await table.getByRole('button', { name: 'Annual salary', exact: true }).click();
  await expect(page).toHaveURL(/sortOrder=desc/);
  await expect(table.getByRole('row').nth(1)).toContainText('USD 10,026.00');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(table.getByRole('row')).toHaveCount(2);
  await expect(table.getByRole('row').nth(1)).toContainText('USD 10,001.00');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export matching', exact: true }).click();
  const download = await downloadEvent;
  expect(await download.failure()).toBeNull();
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const exported = parse(Buffer.concat(chunks).toString('utf8'), { columns: true, bom: true }) as Array<Record<string, string>>;
  expect(exported).toHaveLength(26);
  expect(new Set(exported.map((item) => item.employeeCode)).size).toBe(26);
  // Export has its own documented name-ascending order, independent of the displayed salary sort.
  const nameOrder = [1, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 2, 20, 21, 22, 23, 24, 25, 26, 3, 4, 5, 6, 7, 8, 9];
  expect(exported.map((item) => item.employeeCode)).toEqual(nameOrder.map((number) => prefix + '-' + String(number).padStart(2, '0')));
  expect(exported.find((item) => item.employeeCode === prefix + '-26')).toMatchObject({ salary: '10026.00', country: 'US' });
  expect(exported[0]).toMatchObject({ salary: '10001.00', name: "'=Coverage Formula" });
});

test('persisted reports preserve exact native totals, bands, tenure, outliers and missing-FX recovery', async ({ page }) => {
  const { prefix, headers } = journeyFixture();
  // Ten recorded salaries meet the documented outlier-cohort minimum.
  const salaries = ['10000.00', '10000.00', '20000.00', '20000.00', '30000.00', '30000.00', '40000.00', '40000.00', '50000.00', '200000.00'];
  const rows = salaries.map((amount, index) => `${prefix}-${index},Report Person ${index},${prefix.toLowerCase()}-${index}@example.test,US,${prefix},Analyst,FULL_TIME,2020-02-29,${amount},USD`);
  rows.push(`${prefix}-EUR,Euro Person,${prefix.toLowerCase()}-eur@example.test,FR,${prefix},Analyst,FULL_TIME,2020-02-29,9000.00,EUR`);
  rows.push(`${prefix}-PENDING,Pending Person,${prefix.toLowerCase()}-pending@example.test,US,${prefix},Analyst,FULL_TIME,2020-02-29,,USD`);
  await importRows(page, headers, rows);
  await page.goto('/?q=' + prefix);
  const summary = page.getByRole('region', { name: 'Current annual commitments' });
  await expect(summary.getByRole('heading', { name: 'USD salaries', exact: true })).toBeVisible();
  await expect(summary.getByText('USD 450,000.00', { exact: true })).toBeVisible();
  await expect(summary.getByRole('heading', { name: 'EUR salaries', exact: true })).toBeVisible();
  await expect(summary.getByText('1 employee has salary pending.', { exact: true })).toBeVisible();
  const report = await page.request.get('/api/insights?q=' + prefix);
  expect(report.status()).toBe(200);
  const data = (await report.json()).data;
  expect(data).toMatchObject({ headcount: 12, salaryPendingCount: 1, reportingAvailable: true });
  expect(data.summaries).toEqual(expect.arrayContaining([
    expect.objectContaining({ currency: 'USD', count: 10, total: '450000.00', average: '45000.00', median: '30000.00', p25: '20000.00', p75: '40000.00' }),
    expect.objectContaining({ currency: 'EUR', count: 1, total: '9000.00' }),
  ]));
  const bandRows = await page.getByRole('table', { name: 'USD salary bands', exact: true }).getByRole('row').all();
  let bandCount = 0;
  for (const row of bandRows.slice(1)) bandCount += Number(await row.getByRole('cell').last().innerText());
  expect(bandCount).toBe(10);
  const tenure = page.getByRole('table', { name: 'Pay by tenure bucket', exact: true });
  await expect(tenure.getByRole('row').filter({ hasText: 'USD 45,000.00' })).toContainText('USD 30,000.00');
  await expect(page.getByRole('link', { name: 'Report Person 9', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Group results by', exact: true }).click();
  await page.getByRole('option', { name: 'Department', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Salary statistics by department' })).toContainText(prefix);
  await page.getByRole('button', { name: 'Approximate USD', exact: true }).click();
  await expect(page.getByText(/Approximate USD totals are unavailable because there is no complete, current rate snapshot/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Approximate USD salaries', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Native currencies', exact: true }).click();
  await expect(summary.getByText('USD 450,000.00', { exact: true })).toBeVisible();
  await page.getByLabel('Search employees').fill(prefix + '-not-present');
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No employees match these filters', exact: true })).toBeVisible();
  await expect(summary).toHaveCount(0);
});
