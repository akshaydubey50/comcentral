import { describe, expect, it } from 'vitest';

import { requireSafeSeedDatabaseUrl } from './seed-target';

function seedEnvironment(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://seed-user:secret@localhost:5432/comcentral_demo',
    COMCENTRAL_SEED_TARGET: 'demo',
    COMCENTRAL_SEED_DATABASE_ACK: 'comcentral_demo',
    ...overrides,
  };
}

describe('requireSafeSeedDatabaseUrl', () => {
  it('refuses production before returning a database target', () => {
    expect(() => requireSafeSeedDatabaseUrl(seedEnvironment({ NODE_ENV: 'production' }))).toThrow(
      'Refusing synthetic seed in production',
    );
  });

  it('requires an explicit demo or test target', () => {
    expect(() => requireSafeSeedDatabaseUrl(seedEnvironment({ COMCENTRAL_SEED_TARGET: undefined }))).toThrow(
      'COMCENTRAL_SEED_TARGET must be explicitly set to demo or test',
    );
    expect(() => requireSafeSeedDatabaseUrl(seedEnvironment({ COMCENTRAL_SEED_TARGET: 'staging' }))).toThrow(
      'COMCENTRAL_SEED_TARGET must be explicitly set to demo or test',
    );
  });

  it('requires a valid PostgreSQL URL with an explicit database name', () => {
    expect(() => requireSafeSeedDatabaseUrl(seedEnvironment({ DATABASE_URL: undefined }))).toThrow(
      'DATABASE_URL is required for synthetic seeding',
    );
    expect(() => requireSafeSeedDatabaseUrl(seedEnvironment({ DATABASE_URL: 'mysql://localhost/comcentral_demo' }))).toThrow(
      'DATABASE_URL must be a valid PostgreSQL target for synthetic seeding',
    );
    expect(() => requireSafeSeedDatabaseUrl(seedEnvironment({ DATABASE_URL: 'postgresql://localhost/' }))).toThrow(
      'DATABASE_URL must include a database name for synthetic seeding',
    );
  });

  it('does not expose a malformed URL in its refusal', () => {
    const secret = 'not-a-url-containing-a-password';

    expect(() => requireSafeSeedDatabaseUrl(seedEnvironment({ DATABASE_URL: secret }))).toThrow(
      'DATABASE_URL must be a valid PostgreSQL target for synthetic seeding',
    );
    expect(() => requireSafeSeedDatabaseUrl(seedEnvironment({ DATABASE_URL: secret }))).not.toThrow(secret);
  });

  it.each([
    'postgresql://localhost/comcentral_demo?host=remote.example',
    'postgresql://localhost/comcentral_demo?%68ost=remote.example',
    'postgresql://localhost/comcentral_demo?host=&host=remote.example',
    'postgresql://localhost/comcentral_demo?port=6432',
    'postgresql://localhost/comcentral_demo?%70ort=6432',
    'postgresql://localhost/comcentral_demo?connectionString=postgresql%3A%2F%2Fremote.example%2Fproduction',
  ])('rejects a seed target override without exposing it: %s', (databaseUrl) => {
    expect(() => requireSafeSeedDatabaseUrl(seedEnvironment({ DATABASE_URL: databaseUrl }))).toThrow(
      'DATABASE_URL must not override its seed target through URL parameters',
    );
    expect(() => requireSafeSeedDatabaseUrl(seedEnvironment({ DATABASE_URL: databaseUrl }))).not.toThrow(databaseUrl);
  });

  it.each([
    ['demo', 'comcentral_test'],
    ['test', 'comcentral_demo'],
    ['demo', 'comcentral'],
  ])('requires the database suffix to match the %s target', (target, databaseName) => {
    expect(() => requireSafeSeedDatabaseUrl(seedEnvironment({
      COMCENTRAL_SEED_TARGET: target,
      DATABASE_URL: `postgresql://localhost/${databaseName}`,
      COMCENTRAL_SEED_DATABASE_ACK: databaseName,
    }))).toThrow(`A ${target} seed target database must end with _${target}`);
  });

  it('requires an exact database-name acknowledgement', () => {
    expect(() => requireSafeSeedDatabaseUrl(seedEnvironment({
      COMCENTRAL_SEED_DATABASE_ACK: undefined,
    }))).toThrow('COMCENTRAL_SEED_DATABASE_ACK must exactly match the seed database name');
    expect(() => requireSafeSeedDatabaseUrl(seedEnvironment({
      COMCENTRAL_SEED_DATABASE_ACK: 'another_demo',
    }))).toThrow('COMCENTRAL_SEED_DATABASE_ACK must exactly match the seed database name');
  });

  it.each([
    ['demo', 'comcentral_demo'],
    ['test', 'comcentral_test'],
  ])('returns an explicitly acknowledged %s database URL', (target, databaseName) => {
    const databaseUrl = `postgresql://seed-user:secret@localhost:5432/${databaseName}?sslmode=require&schema=public&options=-c%20search_path%3Dpublic`;

    expect(requireSafeSeedDatabaseUrl(seedEnvironment({
      DATABASE_URL: databaseUrl,
      COMCENTRAL_SEED_TARGET: target,
      COMCENTRAL_SEED_DATABASE_ACK: databaseName,
    }))).toBe(databaseUrl);
  });
});
