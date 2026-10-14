import { test, expect, type Page } from '@playwright/test';
import type { DirectoryOptions, Employee, Insights } from '../../src/shared/contracts';

// Browser-only contract fixtures keep these UI journeys independent of database setup.
const hr = { id: 'ui-hr', name: 'Frontend Test HR', email: 'hr@example.test' };
const employee: Employee = {
  id: 'ui-employee', employeeCode: 'UI-001', name: 'Frontend Test Employee',
  email: 'employee@example.test', country: 'US', department: 'Engineering', jobRole: 'Engineer',
  employmentType: 'FULL_TIME', joiningDate: '2020-01-01', salary: '60000.00', currency: 'USD',
  status: 'ACTIVE', version: 1, createdAt: '2020-01-01T00:00:00Z', updatedAt: '2026-10-14T00:00:00Z',
};
const options: DirectoryOptions = {
  countries: [{ code: 'US', name: 'United States', currency: 'USD' }],
  departments: ['Engineering'], jobRoles: ['Engineer'],
  employmentTypes: ['FULL_TIME', 'PART_TIME', 'CONTRACT'],
  currencies: ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'SGD'],
};
const stats = {
  count: 2, total: '160000.00', min: '60000.00', max: '100000.00',
  average: '80000.00', median: '80000.00', p25: '70000.00', p75: '90000.00',
};

function insights(usd: boolean): Insights {
  return {
    headcount: 2, asOf: '2026-10-14', currencyMode: usd ? 'USD' : 'NATIVE', groupBy: 'country',
    summaries: usd ? [] : [{ ...stats, currency: 'USD' }],
    groups: usd ? [] : [{ ...stats, currency: 'USD', label: 'US' }],
    bands: usd ? [] : [{ currency: 'USD', label: '50,000–<100,000', lower: '50000', upper: '100000', count: 1 }],
    tenure: usd ? [] : [{ ...stats, currency: 'USD', bucket: '5–<10' }],
    outliers: { data: [], total: 0, minimumGroupSize: 10, cohorts: [] },
    fx: { available: false, state: 'MISSING', provider: 'Test provider', snapshotId: null,
      rateDate: null, fetchedAt: null, lastAttemptAt: null, message: 'No complete FX snapshot is available' },
    reportingAvailable: !usd,
  };
}

async function serveFrontendContracts(page: Page) {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    switch (url.pathname) {
      case '/api/session': return route.fulfill({ json: { user: hr } });
      case '/api/options': return route.fulfill({ json: { data: options } });
      case '/api/employees': return route.fulfill({ json: {
        data: [employee], pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
      } });
      case '/api/employees/ui-employee': return route.fulfill({ json: { data: employee } });
      case '/api/employees/ui-employee/history': return route.fulfill({ json: { data: [] } });
      case '/api/insights': return route.fulfill({ json: { data: insights(url.searchParams.get('currencyMode') === 'USD') } });
      default: return route.fulfill({ status: 500, json: { error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'Unexpected test request' } } });
    }
  });
}

test.beforeEach(async ({ page }) => {
  await serveFrontendContracts(page);
});

test('session check failure stays on the current screen and recovers through Retry', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/session', (route) => {
    requests += 1;
    return requests === 1
      ? route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: 'Temporary failure' } } })
      : route.fulfill({ json: { user: hr } });
  });
  await page.goto('/employees');
  await expect(page.getByText('We could not verify your session.')).toBeVisible();
  await expect(page).toHaveURL(/\/employees$/);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Employees', exact: true })).toBeVisible();
});

test('malformed directory URL uses valid defaults and required form choices can be retried', async ({ page }) => {
  let optionsAvailable = false;
  const requests: URL[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname === '/api/employees') requests.push(url);
  });
  await page.route('**/api/options', (route) => optionsAvailable
    ? route.fulfill({ json: { data: options } })
    : route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: 'Temporary failure' } } }));
  await page.goto('/employees?page=bad&pageSize=Infinity&status=bad&sortBy=bad');
  await expect(page.getByRole('button', { name: 'Add employee', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Retry filter choices' })).toBeVisible();
  expect(requests[0].searchParams.get('page')).toBe('1');
  expect(requests[0].searchParams.get('pageSize')).toBe('25');
  expect(requests[0].searchParams.get('status')).toBe('ACTIVE');
  expect(requests[0].searchParams.get('sortBy')).toBe('name');

  optionsAvailable = true;
  await page.getByRole('button', { name: 'Retry filter choices' }).click();
  await page.getByRole('button', { name: 'Add employee', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Add employee' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Country' }).click();
  await expect(page.getByRole('option', { name: 'United States' })).toBeVisible();
});

test('native reports show complete group statistics and missing FX withholds converted totals', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Current annual commitments' })).toBeVisible();
  const table = page.getByRole('table', { name: 'Salary statistics by country' });
  await expect(table.getByRole('columnheader', { name: 'Minimum' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Maximum' })).toBeVisible();
  await expect(table.getByText('USD 60,000.00')).toBeVisible();

  await page.getByRole('button', { name: 'Approximate USD', exact: true }).click();
  await expect(page.getByText(/Approximate USD totals are unavailable/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Current annual commitments' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Native currencies', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Current annual commitments' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('pay-overview.png'), fullPage: true });
});

test('salary conflicts require an explicit reload and fresh review before another submission', async ({ page }) => {
  let latest = employee;
  const writes: unknown[] = [];
  await page.route('**/api/employees/ui-employee', (route) => route.fulfill({ json: { data: latest } }));
  await page.route('**/api/employees/ui-employee/history', (route) => route.fulfill({ json: {
    data: latest.version === 1 ? [] : [{
      id: 'history-1', employeeId: employee.id, previousSalary: employee.salary,
      previousCurrency: 'USD', salary: latest.salary, currency: 'USD',
      reason: 'Concurrent salary review', actor: hr, createdAt: '2026-10-14T12:00:00Z',
    }],
  } }));
  await page.route('**/api/employees/ui-employee/salary', (route) => {
    writes.push(route.request().postDataJSON());
    latest = { ...employee, salary: '65000.00', version: 2 };
    return route.fulfill({ status: 409, json: { error: { code: 'VERSION_CONFLICT', message: 'Record changed' } } });
  });
  await page.goto('/employees/ui-employee');
  await page.getByRole('button', { name: 'Change salary', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Change annual salary' });
  await dialog.getByLabel('New annual base salary').fill('70000.00');
  await dialog.getByLabel('Reason for change').fill('Annual review');
  await dialog.getByRole('button', { name: 'Apply salary change' }).click();
  await dialog.getByRole('button', { name: 'Reload latest' }).click();
  await expect(dialog.getByLabel('New annual base salary')).toHaveValue('65000.00');
  await expect(dialog.getByLabel('Reason for change')).toHaveValue('');
  expect(writes).toEqual([{ salary: '70000.00', currency: 'USD', reason: 'Annual review', version: 1 }]);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByText('Concurrent salary review')).toBeVisible();
});

test('mobile navigation opens and closes while retaining a usable directory', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/employees');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('link', { name: 'CSV migration', exact: true }).click();
  await expect(page).toHaveURL(/\/imports$/);
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('mobile-imports.png'), fullPage: true });
});
