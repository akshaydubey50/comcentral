import { expect, test } from './browser-fixture';

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
