import { describe, expect, it } from 'vitest';

import { requireLocalBrowserTestTarget } from '../../../tests/e2e/test-target';

const local = { E2E_BASE_URL: 'http://localhost:3102', DATABASE_URL: 'postgresql://localhost:55439/registration_test' };

describe('real browser test target guard', () => {
  it('accepts a locally started app with a local test database', () => {
    expect(() => requireLocalBrowserTestTarget(local)).not.toThrow();
    expect(() => requireLocalBrowserTestTarget({
      ...local,
      DATABASE_URL: `${local.DATABASE_URL}?sslmode=require&schema=public&options=-c%20search_path%3Dpublic`,
    })).not.toThrow();
  });

  it.each([
    { E2E_BASE_URL: 'https://production.example' },
    { DATABASE_URL: undefined },
    { DATABASE_URL: 'postgresql://localhost/production' },
    { DATABASE_URL: 'postgresql://db.example/registration_test' },
    { DATABASE_URL: 'not-a-url' },
    { DIRECT_URL: 'postgresql://localhost:55439/other_test' },
    { DIRECT_URL: 'postgresql://localhost:55440/registration_test' },
    { DATABASE_URL: 'postgresql://localhost:55439/registration_test?host=remote.example' },
    { DATABASE_URL: 'postgresql://localhost:55439/registration_test?%68ost=remote.example' },
    { DATABASE_URL: 'postgresql://localhost:55439/registration_test?host=&host=remote.example' },
    { DATABASE_URL: 'postgresql://localhost:55439/registration_test?port=6432' },
    { DATABASE_URL: 'postgresql://localhost:55439/registration_test?%70ort=6432' },
    { DATABASE_URL: 'postgresql://localhost:55439/registration_test?connectionString=postgresql%3A%2F%2Fremote.example%2Fproduction' },
    { DIRECT_URL: 'postgresql://localhost:55439/registration_test?host=remote.example' },
  ])('rejects unsafe or inconsistent target configuration case %#', (override) => {
    expect(() => requireLocalBrowserTestTarget({ ...local, ...override })).toThrow(/Real browser tests require/);
  });
});
