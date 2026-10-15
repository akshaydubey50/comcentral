import { expect, test } from '@playwright/test';

test('production documents use fresh matching nonces and block untrusted inline scripts', async ({ page, request }) => {
  await page.route('**/api/session', (route) => route.fulfill({ json: { user: null } }));
  const response = await page.goto('/login');
  const policy = response!.headers()['content-security-policy'];
  expect(policy).toContain("'strict-dynamic'");
  expect(policy).not.toContain('unsafe-eval');
  const nonce = /'nonce-([^']+)'/.exec(policy)![1];
  expect(nonce).toBeTruthy();
  const scriptNonces = await page.locator('script').evaluateAll((scripts) => scripts.map((script) => script.nonce));
  expect(scriptNonces.length).toBeGreaterThan(0);
  expect(scriptNonces.every((value) => value === nonce)).toBe(true);
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  const another = await request.get('/register');
  expect(another.headers()['content-security-policy']).not.toContain(`'nonce-${nonce}'`);

  // Inject into the HTML parser. DevTools-created scripts inherit strict-dynamic trust.
  const blocked: string[] = [];
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => console.error(`CSP_BLOCKED:${event.effectiveDirective}`));
  });
  page.on('console', (message) => {
    if (message.text().startsWith('CSP_BLOCKED:')) blocked.push(message.text());
  });
  await page.route('**/login?csp-probe', async (route) => {
    const original = await route.fetch();
    const html = await original.text();
    await route.fulfill({ response: original, body: html.replace('<head>', '<head><script>document.documentElement.dataset.untrustedScriptRan = "true"</script>') });
  });
  await page.goto('/login?csp-probe');
  expect(blocked).toContain('CSP_BLOCKED:script-src-elem');
  expect(await page.evaluate(() => document.documentElement.dataset.untrustedScriptRan)).toBeUndefined();
});
