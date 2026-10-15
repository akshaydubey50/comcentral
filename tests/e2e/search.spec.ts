import { expect, test, type Page } from './browser-fixture';
import type { DirectoryOptions, Employee } from '../../src/shared/contracts';

const options: DirectoryOptions = {
  countries: [{ code: 'US', name: 'United States', currency: 'USD' }],
  departments: ['Engineering'],
  jobRoles: ['Engineer'],
  employmentTypes: ['FULL_TIME'],
  currencies: ['USD'],
};

function employee(name: string): Employee {
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  return {
    id: slug,
    employeeCode: `SEARCH-${slug.toUpperCase()}`,
    name,
    email: `${slug}@example.test`,
    country: 'US',
    department: 'Engineering',
    jobRole: 'Engineer',
    employmentType: 'FULL_TIME',
    joiningDate: '2020-01-01',
    salary: '60000.00',
    currency: 'USD',
    status: 'ACTIVE',
    version: 1,
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2026-10-15T00:00:00Z',
  };
}

async function serveDirectory(page: Page, requests: URL[]) {
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/session') {
      return route.fulfill({ json: { user: { id: 'search-hr', name: 'Search HR', email: 'hr@example.test' } } });
    }
    if (url.pathname === '/api/options') return route.fulfill({ json: { data: options } });
    if (url.pathname === '/api/employees') {
      requests.push(url);
      const name = url.searchParams.get('q') || 'All employees';
      const pageNumber = Number(url.searchParams.get('page') || 1);
      return route.fulfill({ json: {
        data: [employee(name)],
        pagination: { page: pageNumber, pageSize: 25, total: 100, totalPages: 4 },
      } });
    }
    return route.fulfill({ status: 500, json: { error: { code: 'UNEXPECTED_TEST_REQUEST', message: url.pathname } } });
  });
}

test('keyboard submit, clear, and browser history keep the URL draft and results aligned', async ({ page }) => {
  const requests: URL[] = [];
  await serveDirectory(page, requests);
  await page.goto('/employees?q=Ada&page=3&status=ACTIVE');

  const search = page.getByRole('textbox', { name: 'Search employees' });
  await expect(search).toHaveValue('Ada');
  await expect(page.getByRole('link', { name: 'Ada', exact: true })).toBeVisible();
  const initialRequests = requests.length;

  await search.fill('Grace');
  await expect(page).toHaveURL(/q=Ada/);
  expect(requests).toHaveLength(initialRequests);
  await search.press('Enter');
  await expect(page).toHaveURL(/q=Grace/);
  await expect(page).toHaveURL(/page=1/);
  await expect(page.getByRole('link', { name: 'Grace', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page).not.toHaveURL(/q=/);
  await expect(page).toHaveURL(/page=1/);
  await expect(search).toHaveValue('');
  await expect(page.getByRole('link', { name: 'All employees', exact: true })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/q=Grace/);
  await expect(search).toHaveValue('Grace');
  await expect(page.getByRole('link', { name: 'Grace', exact: true })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/q=Ada/);
  await expect(page).toHaveURL(/page=3/);
  await expect(search).toHaveValue('Ada');
  await expect(page.getByRole('link', { name: 'Ada', exact: true })).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(/q=Grace/);
  await expect(search).toHaveValue('Grace');
  await expect(page.getByRole('link', { name: 'Grace', exact: true })).toBeVisible();
});
