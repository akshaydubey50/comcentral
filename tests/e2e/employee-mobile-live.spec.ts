import { randomUUID } from 'node:crypto';
import { expect, test } from './browser-fixture';
import { requireLocalBrowserTestTarget } from './test-target';

// This test creates only synthetic fixtures on the explicitly isolated local target.
test.skip(process.env.E2E_ALLOW_REGISTRATION !== 'true', 'Requires isolated registration opt-in');
test.use({ viewport: { width: 360, height: 900 }, trace: 'off', screenshot: 'off', video: 'off' });
test.beforeAll(() => requireLocalBrowserTestTarget());

test('mobile cards open a real employee and preserve archive/restore behavior', async ({ page }) => {
  const origin = process.env.E2E_BASE_URL!;
  const headers = { Origin: origin };
  const code = `MOBILE-${randomUUID().slice(0, 8)}`;
  const signup = await page.request.post('/api/auth/sign-up/email', {
    headers, data: { name: 'Mobile Journey HR', email: `${code.toLowerCase()}@example.test`, password: 'aB3!x' },
  });
  expect(signup.status()).toBe(200);
  const created = await page.request.post('/api/employees', {
    headers, data: { employeeCode: code, name: 'Mobile Journey Employee', email: `${code.toLowerCase()}-employee@example.test`,
      country: 'US', department: 'Quality', jobRole: 'Analyst', employmentType: 'FULL_TIME',
      joiningDate: '2020-02-29', salary: '12345.67', currency: 'USD' },
  });
  expect(created.status()).toBe(201);
  const employeeId = (await created.json()).data.id;
  await page.goto(`/employees?q=${code}`);
  const cards = page.getByRole('list', { name: 'Employee directory cards' });
  await expect(cards.getByText('USD 12,345.67', { exact: true })).toBeVisible();
  await cards.getByRole('link', { name: 'View employee details for Mobile Journey Employee' }).click();
  await expect(page).toHaveURL(new RegExp(`/employees/${employeeId}$`));
  await page.getByRole('button', { name: 'Archive employee', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Change salary', exact: true })).toBeDisabled();
  await page.goto(`/employees?q=${code}&status=ARCHIVED`);
  await expect(cards.getByText('Archived', { exact: true })).toBeVisible();
  await cards.getByRole('link', { name: 'View employee details for Mobile Journey Employee' }).click();
  await page.getByRole('button', { name: 'Restore employee', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Change salary', exact: true })).toBeEnabled();
  const persisted = await page.request.get(`/api/employees/${employeeId}`);
  expect((await persisted.json()).data).toMatchObject({ status: 'ACTIVE', salary: '12345.67', currency: 'USD' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
