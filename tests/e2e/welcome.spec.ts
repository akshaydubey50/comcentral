import { expect, test, type Page } from './browser-fixture';

const hr = { id: 'welcome-hr', name: 'Welcome HR', email: 'hr@example.test' };
const homeHeading = 'Know your people. Understand their pay.';

async function serveWorkspaceSession(page: Page, user: typeof hr | null) {
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/session') return route.fulfill({ json: { user } });
    // Retryable report failures keep navigation checks independent of report fixtures.
    return route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: 'Test report unavailable' } } });
  });
}

async function openPublicHome(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1, name: homeHeading })).toBeVisible();
}

test('the permanent welcome route exposes working mobile navigation and account entry links', async ({ page }) => {
  let sessionRequests = 0;
  await page.route('**/api/session', (route) => {
    sessionRequests += 1;
    return route.fulfill({ json: { user: null } });
  });
  await page.setViewportSize({ width: 320, height: 800 });
  await openPublicHome(page, '/welcome');

  const header = page.getByRole('navigation', { name: 'Home navigation' });
  await expect(header.getByRole('link', { name: 'Features', exact: true })).toBeVisible();
  await expect(header.getByRole('link', { name: 'How it works', exact: true })).toBeVisible();
  expect(sessionRequests).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByRole('link', { name: 'ComCentral home', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1, name: homeHeading })).toBeVisible();

  await openPublicHome(page, '/welcome');
  await header.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

  await openPublicHome(page, '/welcome');
  await page.getByRole('navigation', { name: 'Get started' }).getByRole('link', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
});

test('anonymous root explains the product, workflow and shared access', async ({ page }) => {
  await serveWorkspaceSession(page, null);
  await openPublicHome(page);

  await expect(page.getByRole('heading', { name: 'Practical tools for employee and compensation work' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'From spreadsheet to daily HR work' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'One shared HR workspace' })).toBeVisible();
  await expect(page.locator('#csv-import').getByRole('heading', { name: 'Review CSV migrations' })).toBeVisible();
});

const sectionLinks = [
    { navigation: 'Home navigation', link: 'Features', hash: '#features', target: '#features', heading: 'Practical tools for employee and compensation work' },
    { navigation: 'Home navigation', link: 'How it works', hash: '#how-it-works', target: '#how-it-works', heading: 'From spreadsheet to daily HR work' },
    { navigation: 'Get started', link: 'Explore the workspace', hash: '#features', target: '#features', heading: 'Practical tools for employee and compensation work' },
    { navigation: 'Explore workspace tools', link: 'Employee directory', hash: '#directory', target: '#directory', heading: 'Keep the directory useful' },
    { navigation: 'Explore workspace tools', link: 'Salary history', hash: '#salary-history', target: '#salary-history', heading: 'Keep salary decisions traceable' },
    { navigation: 'Explore workspace tools', link: 'Pay insights', hash: '#reporting', target: '#reporting', heading: 'Understand current pay' },
  ] as const;

// Separate journeys give each destination its own failure evidence and normal timeout.
for (const item of sectionLinks) {
  test(`anonymous home ${item.link} reaches its documented section`, async ({ page }) => {
    await serveWorkspaceSession(page, null);
    await openPublicHome(page);
    await page.getByRole('navigation', { name: item.navigation }).getByRole('link', { name: item.link, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${item.hash}$`));
    const target = page.locator(item.target);
    await expect(target).toBeInViewport();
    await expect(target.getByRole('heading', { name: item.heading })).toBeVisible();
  });
}

const routeLinks = [
    { link: 'Get started with ComCentral', path: /\/register$/, heading: 'Create your account' },
    { link: 'Open your workspace', path: /\/login$/, heading: 'Welcome back' },
  ] as const;

for (const item of routeLinks) {
  test(`anonymous home ${item.link} opens its account route`, async ({ page }) => {
    await serveWorkspaceSession(page, null);
    await openPublicHome(page);
    await page.getByRole('link', { name: item.link, exact: true }).click();
    await expect(page).toHaveURL(item.path);
    await expect(page.getByRole('heading', { name: item.heading })).toBeVisible();
  });
}

test('home keyboard entry and narrow layout remain usable', async ({ page }) => {
  await serveWorkspaceSession(page, null);
  await page.setViewportSize({ width: 320, height: 900 });
  await openPublicHome(page);

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

test('signed-in users keep the workspace at the root route', async ({ page }) => {
  await serveWorkspaceSession(page, hr);

  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Organization pay overview' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: homeHeading })).toHaveCount(0);
});

test('signed-in users can open their workspace from the public welcome page', async ({ page }) => {
  await serveWorkspaceSession(page, hr);

  await openPublicHome(page, '/welcome');
  await page.getByRole('link', { name: 'Open your workspace', exact: true }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Organization pay overview' })).toBeVisible();
});
