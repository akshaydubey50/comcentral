import { expect, test } from './browser-fixture';

const hr = { id: 'welcome-hr', name: 'Welcome HR', email: 'hr@example.test' };

test('public welcome explains the product and opens both account routes', async ({ page }) => {
  let sessionRequests = 0;
  await page.route('**/api/session', (route) => {
    sessionRequests += 1;
    return route.fulfill({ json: { user: null } });
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/welcome');

  await expect(page.getByRole('heading', { level: 1, name: 'HR records and pay context in one workspace.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Keep the directory useful' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Review CSV migrations' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Understand current pay' })).toBeVisible();
  expect(sessionRequests).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goBack();
  await page.getByRole('link', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
});

test('signed-in users can open their workspace from the public welcome page', async ({ page }) => {
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/session') return route.fulfill({ json: { user: hr } });
    // Retryable report failures keep this navigation check independent of report fixtures.
    return route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: 'Test report unavailable' } } });
  });

  await page.goto('/welcome');
  await expect(page.getByRole('heading', { level: 1, name: 'HR records and pay context in one workspace.' })).toBeVisible();
  await page.getByRole('link', { name: 'Open your workspace', exact: true }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Organization pay overview' })).toBeVisible();
});
