import { expect, test, type Page } from './browser-fixture';

const hr = { id: 'welcome-hr', name: 'Welcome HR', email: 'hr@example.test' };

async function serveWorkspaceSession(page: Page, user: typeof hr | null) {
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/session') return route.fulfill({ json: { user } });
    // Retryable report failures keep navigation checks independent of report fixtures.
    return route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: 'Test report unavailable' } } });
  });
}

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

  await page.getByRole('navigation', { name: 'Get started' }).getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goBack();
  await page.getByRole('link', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
});

test('anonymous users see the public home at the root route', async ({ page }) => {
  await serveWorkspaceSession(page, null);

  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'HR records and pay context in one workspace.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create account', exact: true })).toHaveAttribute('href', '/register');
  await expect(page.getByRole('navigation', { name: 'Get started' }).getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute('href', '/login');
});

test('home sections and keyboard entry remain usable across viewport sizes', async ({ page }) => {
  await serveWorkspaceSession(page, null);
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('HR records and pay context in one workspace.');
    await expect(page.getByRole('heading', { name: 'One shared HR workspace' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('HR records and pay context in one workspace.');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await page.getByRole('navigation', { name: 'Home navigation' }).getByRole('link', { name: 'How it works' }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect(page.getByRole('heading', { name: 'From spreadsheet to daily HR work' })).toBeInViewport();
  await page.getByRole('link', { name: 'Get started with ComCentral' }).click();
  await expect(page).toHaveURL(/\/register$/);
});

test('signed-in users keep the workspace at the root route', async ({ page }) => {
  await serveWorkspaceSession(page, hr);

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Organization pay overview' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'HR records and pay context in one workspace.' })).toHaveCount(0);
});

test('signed-in users can open their workspace from the public welcome page', async ({ page }) => {
  await serveWorkspaceSession(page, hr);

  await page.goto('/welcome');
  await expect(page.getByRole('heading', { level: 1, name: 'HR records and pay context in one workspace.' })).toBeVisible();
  await page.getByRole('link', { name: 'Open your workspace', exact: true }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Organization pay overview' })).toBeVisible();
});
