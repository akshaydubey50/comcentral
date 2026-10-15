import { test, expect } from './browser-fixture';

// These public GET-only journeys do not provision users or touch employee data.
for (const path of ['/this-page-does-not-exist', '/employees/unknown/path']) {
  test(`unknown URL ${path} renders the branded 404 boundary`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page).toHaveURL(new RegExp(path + '$'));
    await expect(page.getByRole('heading', { level: 1, name: /Page not found/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to home', exact: true })).toHaveAttribute('href', '/');
    await expect(page.getByRole('link', { name: 'Employee directory', exact: true })).toHaveAttribute('href', '/employees');
    await expect(page.getByRole('link', { name: 'Explore ComCentral', exact: true })).toHaveAttribute('href', '/welcome');
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toHaveAttribute('content', /noindex/);
  });
}

test('404 recovery stays usable on phones and opens a real public page', async ({ page }) => {
  await page.goto('/this-page-does-not-exist');
  for (const name of ['ComCentral home', 'Back to home', 'Employee directory', 'Explore ComCentral']) {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name, exact: true })).toBeFocused();
  }
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('heading', { level: 1, name: /Page not found/ })).toBeVisible();
    const home = page.getByRole('link', { name: 'Back to home', exact: true });
    await expect(home).toBeVisible();
    await home.focus();
    await expect(home).toBeFocused();
    expect((await home.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.getByRole('link', { name: 'Explore ComCentral', exact: true }).click();
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
