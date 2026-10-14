import { expect, test, type Page } from '@playwright/test';

const hr = { id: 'new-hr', name: 'Ada HR', email: 'ada@example.test' };

/** Intercept all API requests so browser auth checks never create real accounts. */
async function accountRoutes(page: Page, options: { duplicate?: boolean; sessionMissing?: boolean; authenticated?: boolean } = {}) {
  let signedIn = options.authenticated ?? false;
  const registrations: unknown[] = [];
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/session') return route.fulfill({ json: { user: signedIn ? hr : null } });
    if (path === '/api/auth/sign-up/email') {
      registrations.push(route.request().postDataJSON());
      if (options.duplicate) return route.fulfill({ status: 422, json: { code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', message: 'Duplicate' } });
      signedIn = !options.sessionMissing;
      return route.fulfill({ json: { user: hr, token: null } });
    }
    if (path === '/api/auth/sign-in/email') {
      signedIn = true;
      return route.fulfill({ json: { user: hr } });
    }
    // A retryable report error still lets us verify entry to the real dashboard shell.
    return route.fulfill({ status: 503, json: { error: { code: 'UNAVAILABLE', message: 'Test report unavailable' } } });
  });
  return registrations;
}

async function fillRegistration(page: Page, confirmation = 'a-secure-password') {
  await page.getByLabel(/^Full name/).fill('Ada HR');
  await page.getByLabel(/^Work email/).fill('ada@example.test');
  await page.getByLabel(/^Password/).fill('a-secure-password');
  await page.getByLabel(/^Confirm password/).fill(confirmation);
}

test('new users can navigate from login to registration and enter the dashboard', async ({ page }, testInfo) => {
  const registrations = await accountRoutes(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/login');
  await page.getByRole('link', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('registration-desktop.png'), fullPage: true });
  await fillRegistration(page);
  await page.getByLabel(/^Password/).fill('abcde');
  await page.getByLabel(/^Confirm password/).fill('abcde');
  await page.getByRole('button', { name: 'Show password', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel(/^Password/)).toHaveAttribute('type', 'text');
  await expect(page.getByLabel(/^Confirm password/)).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Show confirm password', exact: true }).click();
  await expect(page.getByLabel(/^Confirm password/)).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  await page.getByRole('button', { name: 'Hide confirm password', exact: true }).click();
  expect(registrations).toEqual([]);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Organization pay overview' })).toBeVisible();
  expect(registrations).toEqual([{ name: 'Ada HR', email: 'ada@example.test', password: 'abcde' }]);
  expect(errors).toEqual([]);
});

test('mobile registration validates matching passwords and links back to login', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const registrations = await accountRoutes(page);
  await page.goto('/register');
  await fillRegistration(page, 'different-password');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText('Passwords must match.')).toBeVisible();
  await expect(page.getByLabel(/^Confirm password/)).toBeFocused();
  expect(registrations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('registration-mobile.png'), fullPage: true });
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

test('duplicate accounts show a useful error and can return to sign in', async ({ page }) => {
  await accountRoutes(page, { duplicate: true });
  await page.goto('/register');
  await fillRegistration(page);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'An account with this email already exists.' })).toBeVisible();
  await expect(page).toHaveURL(/\/register$/);
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Work email').fill('ada@example.test');
  await page.getByLabel(/^Password/).fill('a-secure-password');
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  await expect(page.getByLabel(/^Password/)).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  await expect(page.getByLabel(/^Password/)).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('a missing signup session leads to login recovery without resubmitting registration', async ({ page }) => {
  const registrations = await accountRoutes(page, { sessionMissing: true });
  await page.goto('/register');
  await fillRegistration(page);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByText('Your account was created. Sign in to open your workspace.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create account', exact: true })).toHaveCount(0);
  expect(registrations).toHaveLength(1);
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('existing sessions go to the dashboard instead of registration or external redirects', async ({ page }) => {
  const registrations = await accountRoutes(page, { authenticated: true });
  await page.goto('/register?next=https://example.invalid');
  await expect(page).toHaveURL(/\/$/);
  expect(registrations).toEqual([]);
});
