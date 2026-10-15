import { test, expect } from './browser-fixture';
import type { ImportPreview } from '../../src/shared/contracts';

const row = {
  employeeCode: 'REVIEW-001', name: 'CSV Review Employee', email: 'csv@example.test',
  country: 'US', department: 'Quality', jobRole: 'Analyst', employmentType: 'FULL_TIME' as const,
  joiningDate: '2020-01-01', salary: '75000.01', currency: 'USD' as const,
};
const preview: ImportPreview = {
  valid: true, totalRows: 1, salaryPendingCount: 0, preview: [row], errors: [], errorCount: 0, previewHash: 'reviewed-hash',
};
const file = (name: string, text: string) => ({ name, mimeType: 'text/csv', buffer: Buffer.from(text) });

test.beforeEach(async ({ page }) => {
  await page.route('**/api/session', (route) => route.fulfill({ json: {
    user: { id: 'csv-hr', name: 'CSV Test HR', email: 'hr@example.test' },
  } }));
});

test('CSV replacement invalidates review and commits only the newly reviewed file', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const commits: unknown[] = [];
  await page.route('**/api/imports/preview', (route) => route.fulfill({ json: { data: {
    ...preview, previewHash: route.request().postDataJSON().csvText === 'latest contents' ? 'latest-hash' : 'first-hash',
  } } }));
  await page.route('**/api/imports/commit', (route) => {
    commits.push(route.request().postDataJSON());
    return route.fulfill({ json: { data: { imported: 1 } } });
  });
  await page.goto('/imports');
  const input = page.locator('input[type="file"]');
  const validate = page.getByRole('button', { name: 'Validate and preview' });
  await input.setInputFiles(file('first.csv', 'first contents'));
  await expect(validate).toBeEnabled();
  await validate.press('Enter');
  await expect(page.getByRole('button', { name: 'Confirm and import 1 employees' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Employee import preview' }).getByText('USD 75,000.01')).toBeVisible();
  await input.setInputFiles(file('latest.csv', 'latest contents'));
  await expect(page.getByRole('button', { name: /Confirm and import/ })).toHaveCount(0);
  await expect(validate).toBeEnabled();
  await validate.click();
  await page.getByRole('button', { name: 'Confirm and import 1 employees' }).click();
  await expect(page.getByRole('heading', { name: 'Import complete' })).toBeVisible();
  expect(commits).toEqual([{ csvText: 'latest contents', previewHash: 'latest-hash', confirmed: true }]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('CSV errors and pending confirmation retain a recoverable reviewed state', async ({ page }) => {
  let previews = 0;
  let finishCommit!: () => void;
  const pending = new Promise<void>((resolve) => { finishCommit = resolve; });
  let commitAttempts = 0;
  await page.route('**/api/imports/preview', (route) => {
    previews += 1;
    return previews === 1
      ? route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: 'Validation temporarily unavailable' } } })
      : route.fulfill({ json: { data: preview } });
  });
  await page.route('**/api/imports/commit', async (route) => {
    commitAttempts += 1;
    if (commitAttempts === 1) {
      await pending;
      return route.fulfill({ status: 409, json: { error: { code: 'CONFLICT', message: 'Employee data changed; review the file again.' } } });
    }
    return route.fulfill({ json: { data: { imported: 1 } } });
  });
  await page.goto('/imports');
  const input = page.locator('input[type="file"]');
  await input.setInputFiles(file('review.csv', 'review contents'));
  const validate = page.getByRole('button', { name: 'Validate and preview' });
  await expect(validate).toBeEnabled();
  await validate.click();
  await expect(page.getByRole('alert').filter({ hasText: 'Validation temporarily unavailable' })).toBeVisible();
  await validate.click();
  const confirm = page.getByRole('button', { name: 'Confirm and import 1 employees' });
  await confirm.click();
  await expect(input).toBeDisabled();
  await expect(confirm).toBeDisabled();
  await expect(page.getByRole('progressbar', { name: 'Importing employees' })).toBeVisible();
  finishCommit();
  await expect(page.getByRole('alert').filter({ hasText: 'Employee data changed' })).toBeVisible();
  await expect(input).toBeEnabled();
  await validate.click();
  await expect(confirm).toBeEnabled();
  await confirm.press('Enter');
  await expect(page.getByRole('heading', { name: 'Import complete' })).toBeVisible();
  expect(commitAttempts).toBe(2);
});
