import { randomUUID } from 'node:crypto';
import { expect, test } from './live-session';
import { requireLocalBrowserTestTarget } from './test-target';

// These UI writes are permitted only on the explicitly isolated local app database.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
test.beforeAll(() => requireLocalBrowserTestTarget());

for (const width of [360, 1280]) {
  test(`employee UI creates, views, edits, deletes and restores a persisted record at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const code = 'CRUD-' + randomUUID().slice(0, 8);
    await page.goto('/employees?q=' + code);
    await page.getByRole('button', { name: 'Add employee', exact: true }).first().click();
    const add = page.getByRole('dialog', { name: 'Add employee', exact: true });
    await add.getByLabel(/^Employee code/).fill(code);
    await add.getByLabel(/^Full name/).fill('CRUD UI Employee');
    await add.getByLabel(/^Work email/).fill(code.toLowerCase() + '-employee@example.test');
    await add.getByRole('combobox', { name: /^Country/ }).click();
    await page.getByRole('option', { name: 'India', exact: true }).click();
    await add.getByRole('combobox', { name: /^Currency/ }).click();
    await page.getByRole('option', { name: 'INR', exact: true }).click();
    await add.getByLabel(/^Department/).fill('CRUD Quality');
    await add.getByLabel(/^Job role/).fill('Verification Analyst');
    await add.getByLabel(/^Joining date/).fill('2020-02-29');
    await add.getByLabel(/^Annual base salary/).fill('12345.67');
    const createResponse = page.waitForResponse((response) => response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/employees');
    await add.getByRole('button', { name: 'Add employee', exact: true }).click();
    const created = await createResponse;
    expect(created.status()).toBe(201);
    const employee = (await created.json()).data;
    await expect(add).toHaveCount(0);
    await page.reload();

    const directory = width < 900
      ? page.getByRole('list', { name: 'Employee directory cards' })
      : page.getByRole('table', { name: 'Employee directory', exact: true });
    const view = directory.getByRole('link', { name: 'View employee details for CRUD UI Employee', exact: true });
    await expect(view).toBeInViewport();
    await view.click();
    await expect(page.getByRole('heading', { level: 1, name: 'CRUD UI Employee', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete employee', exact: true })).toBeVisible();

    await page.goto('/employees?q=' + code);
    const editAction = directory.getByRole('button', { name: 'Edit employee details for CRUD UI Employee', exact: true });
    await expect(editAction).toBeInViewport();
    await editAction.click();
    const edit = page.getByRole('dialog', { name: 'Edit employee details', exact: true });
    await edit.getByLabel(/^Full name/).fill('CRUD UI Employee Updated');
    await edit.getByLabel(/^Department/).fill('CRUD Operations');
    await edit.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(edit).toHaveCount(0);
    await page.reload();
    await directory.getByRole('link', { name: 'View employee details for CRUD UI Employee Updated', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'CRUD UI Employee Updated', exact: true })).toBeVisible();
    const persisted = (await (await page.request.get('/api/employees/' + employee.id)).json()).data;
    expect(persisted).toMatchObject({ name: 'CRUD UI Employee Updated', department: 'CRUD Operations', salary: '12345.67', currency: 'INR', version: 2 });

    await page.getByRole('button', { name: 'Delete employee', exact: true }).click();
    const confirmation = page.getByRole('dialog', { name: 'Delete employee?', exact: true });
    await expect(confirmation).toContainText('Deleting archives this employee');
    const deleteResponse = page.waitForResponse((response) => response.request().method() === 'DELETE' && new URL(response.url()).pathname === '/api/employees/' + employee.id);
    await confirmation.getByRole('button', { name: 'Delete', exact: true }).click();
    expect((await deleteResponse).status()).toBe(200);
    await expect(page.getByRole('button', { name: 'Restore employee', exact: true })).toBeVisible();
    const history = (await (await page.request.get('/api/employees/' + employee.id + '/history')).json()).data;
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ previousSalary: null, salary: '12345.67', reason: 'Initial salary recorded at employee creation' });

    await page.goto('/employees?q=' + code);
    await expect(page.getByText('No employees found', { exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: 'Status', exact: true }).click();
    await page.getByRole('option', { name: 'Archived', exact: true }).click();
    await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
    await expect(page).toHaveURL(/status=ARCHIVED/);
    await directory.getByRole('link', { name: 'View employee details for CRUD UI Employee Updated', exact: true }).click();
    await page.getByRole('button', { name: 'Restore employee', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Restore', exact: true }).click();
    const restored = (await (await page.request.get('/api/employees/' + employee.id)).json()).data;
    expect(restored).toMatchObject({ status: 'ACTIVE', salary: '12345.67', version: 4 });
    await expect((await page.request.get('/api/employees/' + employee.id + '/history')).json()).resolves.toEqual({ data: history });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
