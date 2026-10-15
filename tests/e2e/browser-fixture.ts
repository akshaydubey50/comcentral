import { test as base, expect } from '@playwright/test';

/** Fail journeys on CSP violations or unhandled application errors. */
export const test = base.extend<{ browserIntegrity: void }>({
  browserIntegrity: [async ({ page }, use) => {
    const failures: string[] = [];
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (event) => {
        // Record only the directive, never a URL or inline source.
        console.error(`COMCENTRAL_CSP:${event.effectiveDirective}`);
      });
    });
    page.on('console', (message) => {
      if (message.text().startsWith('COMCENTRAL_CSP:')) failures.push(message.text());
    });
    page.on('pageerror', () => failures.push('Unhandled browser exception'));
    await use();
    expect(failures, 'No CSP violations or unhandled exceptions').toEqual([]);
  }, { auto: true }],
});
export { expect };
export type { Page } from '@playwright/test';
