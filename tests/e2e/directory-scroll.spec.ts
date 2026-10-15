import { expect, test, type Page } from './browser-fixture';
import type { DirectoryOptions, Employee } from '../../src/shared/contracts';

const employees: Employee[] = Array.from({ length: 26 }, (_, index) => ({
  id: 'scroll-' + (index + 1), employeeCode: 'SCROLL-' + String(index + 1).padStart(2, '0'),
  name: 'Scroll Employee ' + (index + 1), email: `scroll-${index + 1}@example.test`,
  country: 'US', department: 'Engineering', jobRole: 'Analyst', employmentType: 'FULL_TIME',
  joiningDate: '2020-01-01', salary: '12345.67', currency: 'USD', status: 'ACTIVE', version: 1,
  createdAt: '2020-01-01T00:00:00Z', updatedAt: '2026-10-15T00:00:00Z',
}));
const options: DirectoryOptions = {
  countries: [{ code: 'US', name: 'United States', currency: 'USD' }], departments: ['Engineering'],
  jobRoles: ['Analyst'], employmentTypes: ['FULL_TIME'], currencies: ['USD'],
};

/** Intercept every API call: these layout checks never read or write application data. */
async function serveDirectory(page: Page) {
  const queries: URL[] = [];
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/session') return route.fulfill({ json: { user: { id: 'scroll-hr', name: 'Scroll Test HR', email: 'scroll-hr@example.test' } } });
    if (url.pathname === '/api/options') return route.fulfill({ json: { data: options } });
    if (url.pathname === '/api/employees') {
      queries.push(url);
      const pageNumber = Number(url.searchParams.get('page') || 1);
      const pageSize = Number(url.searchParams.get('pageSize') || 25);
      return route.fulfill({ json: {
        data: employees.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
        pagination: { page: pageNumber, pageSize, total: employees.length, totalPages: Math.ceil(employees.length / pageSize) },
      } });
    }
    return route.fulfill({ status: 500, json: { error: { code: 'UNEXPECTED_TEST_REQUEST', message: 'Unexpected layout test request' } } });
  });
  return queries;
}

for (const width of [1024, 1440]) {
  test(`25 directory rows scroll by keyboard with fixed headers at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const queries = await serveDirectory(page);
    await page.goto('/employees');
    const region = page.getByRole('region', { name: 'Employee directory scroll area', exact: true });
    const table = region.getByRole('table', { name: 'Employee directory', exact: true });
    await expect(table.getByRole('row')).toHaveCount(26);
    expect(queries[0].searchParams.get('pageSize')).toBe('25');
    expect(await region.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
    await region.scrollIntoViewIfNeeded();
    await region.focus();
    await expect(region).toBeFocused();
    await page.keyboard.press('PageDown');
    await expect.poll(() => region.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    const regionBox = (await region.boundingBox())!;
    const headerBox = (await table.getByRole('columnheader', { name: 'Employee', exact: true }).boundingBox())!;
    expect(Math.abs(headerBox.y - regionBox.y)).toBeLessThan(2);
    await page.keyboard.press('End');
    const lastView = table.getByRole('link', { name: 'View employee details for Scroll Employee 25', exact: true });
    await expect(lastView).toBeInViewport();
    await lastView.focus();
    await page.keyboard.press('Tab');
    await expect(table.getByRole('button', { name: 'Edit employee details for Scroll Employee 25', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    // MUI includes the selected value in the select's accessible name.
    await expect(page.getByRole('combobox', { name: /^Rows per page\b/ })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath(`directory-scrolled-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(table.getByRole('row')).toHaveCount(2);
    await expect(table.getByRole('link', { name: 'View employee details for Scroll Employee 26', exact: true })).toBeVisible();
    expect(await region.evaluate((element) => element.scrollTop)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`directory-scroll-${width}.png`), fullPage: true });
  });
}

for (const width of [320, 768]) {
  test(`25 directory records retain readable cards and pagination at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const queries = await serveDirectory(page);
    await page.goto('/employees');
    const cards = page.getByRole('list', { name: 'Employee directory cards', exact: true });
    await expect(cards.getByRole('link', { name: /View employee details for/ })).toHaveCount(25);
    expect(queries[0].searchParams.get('pageSize')).toBe('25');
    await expect(page.getByRole('region', { name: 'Employee directory scroll area' })).toBeHidden();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(cards.getByRole('link', { name: /View employee details for/ })).toHaveCount(1);
    await expect(cards.getByRole('link', { name: 'View employee details for Scroll Employee 26', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
