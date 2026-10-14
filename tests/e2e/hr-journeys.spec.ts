import { test, expect, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { requireLocalBrowserTestTarget } from './test-target';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const origin = process.env.E2E_BASE_URL || 'http://localhost:3000';
test.beforeAll(() => requireLocalBrowserTestTarget());

async function signIn(request: APIRequestContext) {
  if (!email || !password) throw new Error('Set E2E_EMAIL and E2E_PASSWORD for the provisioned test HR account.');
  const response = await request.post('/api/auth/sign-in/email', { data: { email, password }, headers: { Origin: origin } });
  expect(response.ok()).toBeTruthy();
}

function employee(code: string) {
  return { employeeCode: code, name: 'Browser Journey Employee', email: code.toLowerCase() + '@example.test',
    country: 'US', department: 'Quality', jobRole: 'Analyst', employmentType: 'FULL_TIME',
    joiningDate: '2020-02-29', salary: '80000.00', currency: 'USD' };
}

test('anonymous users cannot read directory, reports, or CSV files', async ({ request }) => {
  for (const path of ['/api/employees', '/api/options', '/api/insights', '/api/employees/export', '/api/imports/template']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(401);
  }
  const session = await request.get('/api/session');
  expect(await session.json()).toEqual({ user: null });
});

test('salary update is audited, stale edits fail, and cross-origin writes are blocked', async ({ request }) => {
  await signIn(request);
  const input = employee('E2E-' + randomUUID().slice(0, 8));
  const created = await request.post('/api/employees', { data: input, headers: { Origin: origin } });
  expect(created.status()).toBe(201);
  const record = (await created.json()).data;

  const forbidden = await request.post('/api/employees/' + record.id + '/salary', {
    data: { salary: '90000.00', currency: 'USD', reason: 'External request', version: record.version },
    headers: { Origin: 'https://untrusted.example' },
  });
  expect(forbidden.status()).toBe(403);

  const updated = await request.post('/api/employees/' + record.id + '/salary', {
    data: { salary: '90000.00', currency: 'USD', reason: 'Annual salary review', version: record.version }, headers: { Origin: origin },
  });
  expect(updated.ok()).toBeTruthy();
  const stale = await request.post('/api/employees/' + record.id + '/salary', {
    data: { salary: '91000.00', currency: 'USD', reason: 'Stale browser', version: record.version }, headers: { Origin: origin },
  });
  expect(stale.status()).toBe(409);
  const history = await request.get('/api/employees/' + record.id + '/history');
  const entries = (await history.json()).data;
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({ previousSalary: '80000.00', salary: '90000.00', reason: 'Annual salary review' });

  const refreshed = (await (await request.get('/api/employees/' + record.id)).json()).data;
  const archived = await request.post('/api/employees/' + record.id + '/archive', {
    data: { version: refreshed.version, archived: true }, headers: { Origin: origin },
  });
  expect((await archived.json()).data.status).toBe('ARCHIVED');
  const retained = await request.get('/api/employees/' + record.id + '/history');
  expect((await retained.json()).data).toHaveLength(1);
});

test('invalid CSV import creates no employees', async ({ request }) => {
  await signIn(request);
  const code = 'CSV-' + randomUUID().slice(0, 8);
  const csvText = [
    'employeeCode,name,email,country,department,jobRole,employmentType,joiningDate,salary,currency',
    code + ',Valid Person,' + code.toLowerCase() + '@example.test,US,Quality,Analyst,FULL_TIME,2020-01-01,75000.00,USD',
    code + '-BAD,Invalid Person,invalid@example.test,US,Quality,Analyst,FULL_TIME,2020-01-01,-1,USD',
  ].join('\n');
  const preview = await request.post('/api/imports/preview', { data: { csvText }, headers: { Origin: origin } });
  expect(preview.ok()).toBeTruthy();
  const result = (await preview.json()).data;
  expect(result.valid).toBe(false);
  expect(result.errorCount).toBeGreaterThan(0);
  const committed = await request.post('/api/imports/commit', {
    data: { csvText, previewHash: result.previewHash, confirmed: true }, headers: { Origin: origin },
  });
  expect(committed.status()).toBe(422);
  const matching = await request.get('/api/employees?q=' + encodeURIComponent(code) + '&status=ALL');
  expect((await matching.json()).pagination.total).toBe(0);
});

test('HR signs in, opens the directory, and signs out in the browser', async ({ page }) => {
  if (!email || !password) throw new Error('Set E2E_EMAIL and E2E_PASSWORD before browser tests.');
  await page.goto('/login');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  await page.getByRole('link', { name: 'Employees', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Employees', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});
