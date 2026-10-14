import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';
import { requireLocalBrowserTestTarget } from './test-target';

// Explicit opt-in: this journey persists a user in the disposable application database.
test.skip(process.env.E2E_ALLOW_REGISTRATION !== 'true', 'Requires an isolated app database and E2E_ALLOW_REGISTRATION=true');
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.beforeAll(() => requireLocalBrowserTestTarget());

test('real registration establishes a session, opens shared records, and supports logout/login', async ({ page }) => {
  // Synthetic boundary fixture, usable only behind the isolated local-target guard above.
  const password = 'aB3!x';
  const email = `registration-${randomUUID()}@example.test`;
  await page.goto('/login');
  await page.getByRole('link', { name: 'Create account', exact: true }).click();
  await page.getByLabel(/^Full name/).fill('Registration Journey HR');
  await page.getByLabel(/^Work email/).fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByLabel(/^Confirm password/).fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  const session = await page.request.get('/api/session');
  expect((await session.json()).user?.email === email).toBe(true);
  await page.getByRole('link', { name: 'Employees', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Employees', exact: true })).toBeVisible();
  expect((await page.request.get('/api/employees')).status()).toBe(200);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get('/api/employees')).status()).toBe(401);
  await page.getByLabel(/^Work email/).fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
});
