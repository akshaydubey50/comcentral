import { test, expect } from './browser-fixture';
import type { Insights } from '../../src/shared/contracts';

// Explicit browser-test contracts; no application database is read or written.
const report: Insights = {
  headcount: 20, salaryPendingCount: 5, asOf: '2026-10-15', currencyMode: 'NATIVE', groupBy: 'country',
  summaries: [], groups: [], bands: [], tenure: [],
  outliers: { total: 0, data: [], minimumGroupSize: 10, cohorts: [
    { country: 'BR', currency: 'BRL', jobRole: 'Analyst', employmentType: 'FULL_TIME', count: 15, state: 'EVALUATED' },
  ] },
  fx: { available: false, state: 'MISSING', provider: 'Browser-test provider', snapshotId: null, rateDate: null,
    fetchedAt: null, lastAttemptAt: null, message: 'No complete rate snapshot is available.' },
  reportingAvailable: true,
};

for (const width of [320, 768, 1280]) {
  test(`readiness links retain the population and clear salary status at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const employeeRequests: URL[] = [];
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      switch (url.pathname) {
        case '/api/session': return route.fulfill({ json: { user: { id: 'readiness-hr', name: 'Readiness Test HR', email: 'hr@example.invalid' } } });
        case '/api/options': return route.fulfill({ json: { data: {
          countries: [{ code: 'BR', name: 'Brazil', currency: 'BRL' }], departments: ['Engineering'],
          jobRoles: ['Analyst'], employmentTypes: ['FULL_TIME'], currencies: ['BRL'],
        } } });
        case '/api/insights': return route.fulfill({ json: { data: report } });
        case '/api/employees':
          employeeRequests.push(url);
          return route.fulfill({ json: { data: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } } });
        default: return route.fulfill({ status: 500, json: { error: { code: 'UNEXPECTED_REQUEST', message: 'Unexpected test request' } } });
      }
    });
    await page.goto('/?country=BR&department=Engineering&status=ALL');
    const panel = page.getByRole('region', { name: 'Data readiness' });
    await expect(panel.getByText('15 of 20 employees have a recorded salary (75%).')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const pending = panel.getByRole('link', { name: 'Review pending salaries' });
    await pending.focus();
    await expect(pending).toBeFocused();
    const target = await pending.boundingBox();
    expect(target?.height).toBeGreaterThanOrEqual(44);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/employees\?/);
    await expect(page.getByRole('combobox', { name: 'Salary status' })).toHaveText('Salary pending');
    await expect.poll(() => employeeRequests.length).toBeGreaterThan(0);
    expect(Object.fromEntries(employeeRequests[0].searchParams)).toMatchObject({ country: 'BR', department: 'Engineering', status: 'ALL', salaryStatus: 'PENDING', page: '1' });
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Salary status' })).toHaveText('All salaries');
    await expect.poll(() => employeeRequests.at(-1)?.searchParams.has('salaryStatus')).toBe(false);
  });
}
