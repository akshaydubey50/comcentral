import { request, type APIRequestContext } from '@playwright/test';

import { expect, test as base } from './browser-fixture';
import { requireLocalBrowserTestTarget } from './test-target';

type AuthStorageState = Awaited<ReturnType<APIRequestContext['storageState']>>;

let provisionedHrState: Promise<AuthStorageState> | undefined;

/** Sign in once per Playwright worker and keep the resulting cookies only in memory. */
async function loadProvisionedHrState(): Promise<AuthStorageState> {
  requireLocalBrowserTestTarget();
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error('Set E2E_EMAIL and E2E_PASSWORD for the provisioned test HR account.');
  }

  const origin = process.env.E2E_BASE_URL || 'http://localhost:3000';
  const api = await request.newContext({ baseURL: origin });
  try {
    const response = await api.post('/api/auth/sign-in/email', {
      headers: { Origin: origin },
      data: { email, password },
    });
    expect(response.status()).toBe(200);
    const state = await api.storageState();
    expect(state.cookies.length).toBeGreaterThan(0);
    return state;
  } finally {
    await api.dispose();
  }
}

/** Each test keeps its own browser context while reusing the provisioned HR session cookies. */
export const test = base.extend<{ provisionedHrSession: void }>({
  provisionedHrSession: [async ({ context }, use) => {
    provisionedHrState ??= loadProvisionedHrState();
    const state = await provisionedHrState;
    await context.addCookies(state.cookies);
    await use();
  }, { auto: true }],
});

export { expect };
