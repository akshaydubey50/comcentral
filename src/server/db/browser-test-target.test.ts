import { describe, expect, it } from 'vitest';

import { requireLocalBrowserTestTarget } from '../../../tests/e2e/test-target';

const local = { E2E_BASE_URL: 'http://localhost:3102', DATABASE_URL: 'postgresql://localhost:55439/registration_test' };

describe('real browser test target guard', () => {
  it('accepts a locally started app with a local test database', () => {
    expect(() => requireLocalBrowserTestTarget(local)).not.toThrow();
  });

  it.each([
    { E2E_BASE_URL: 'https://production.example' },
    { DATABASE_URL: undefined },
    { DATABASE_URL: 'postgresql://localhost/production' },
    { DATABASE_URL: 'postgresql://db.example/registration_test' },
    { DATABASE_URL: 'not-a-url' },
    { DIRECT_URL: 'postgresql://localhost:55439/other_test' },
    { DIRECT_URL: 'postgresql://localhost:55440/registration_test' },
  ])('rejects unsafe or inconsistent target configuration case %#', (override) => {
    expect(() => requireLocalBrowserTestTarget({ ...local, ...override })).toThrow(/Real browser tests require/);
  });
});
