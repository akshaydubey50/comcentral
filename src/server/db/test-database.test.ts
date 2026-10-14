import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { requireIsolatedTestDatabaseUrl } from '../../../tests/integration/test-database';

const guardedEnvironmentVariables = [
  'TEST_DATABASE_URL',
  'TEST_DATABASE_DISPOSABLE',
  'DATABASE_URL',
  'DIRECT_URL',
] as const;

const originalEnvironment = Object.fromEntries(
  guardedEnvironmentVariables.map((name) => [name, process.env[name]]),
);

describe('requireIsolatedTestDatabaseUrl', () => {
  beforeEach(() => {
    for (const name of guardedEnvironmentVariables) delete process.env[name];
  });

  afterEach(() => {
    for (const name of guardedEnvironmentVariables) {
      const originalValue = originalEnvironment[name];
      if (originalValue === undefined) delete process.env[name];
      else process.env[name] = originalValue;
    }
  });

  it('rejects a missing test database URL', () => {
    expect(() => requireIsolatedTestDatabaseUrl()).toThrow(
      'TEST_DATABASE_URL is required for database integration tests',
    );
  });

  it('rejects a malformed test database URL without echoing it', () => {
    process.env.TEST_DATABASE_URL = 'not-a-url-containing-a-secret';

    expect(() => requireIsolatedTestDatabaseUrl()).toThrow(
      'TEST_DATABASE_URL must be a valid PostgreSQL URL',
    );
    expect(() => requireIsolatedTestDatabaseUrl()).not.toThrow('not-a-url-containing-a-secret');
  });

  it('rejects a non-PostgreSQL protocol', () => {
    process.env.TEST_DATABASE_URL = 'mysql://localhost/payroll_test';

    expect(() => requireIsolatedTestDatabaseUrl()).toThrow(
      'TEST_DATABASE_URL must use PostgreSQL',
    );
  });

  it('rejects a URL without an explicit database even when marked disposable', () => {
    process.env.TEST_DATABASE_URL = 'postgresql://localhost/';
    process.env.TEST_DATABASE_DISPOSABLE = 'true';

    expect(() => requireIsolatedTestDatabaseUrl()).toThrow(
      'TEST_DATABASE_URL must include a database name',
    );
  });

  it('requires a test suffix unless the target is explicitly disposable', () => {
    process.env.TEST_DATABASE_URL = 'postgresql://localhost/payroll';

    expect(() => requireIsolatedTestDatabaseUrl()).toThrow(
      'Refusing database tests: database name must end in _test or TEST_DATABASE_DISPOSABLE=true',
    );
  });

  it('does not let the disposable override target the application database', () => {
    process.env.DATABASE_URL = 'postgresql://app:secret@db.example.com:5432/payroll';
    process.env.TEST_DATABASE_URL = 'postgresql://tests:secret@db.example.com:5432/payroll';
    process.env.TEST_DATABASE_DISPOSABLE = 'true';

    expect(() => requireIsolatedTestDatabaseUrl()).toThrow(
      'Refusing database tests: TEST_DATABASE_URL targets the application database',
    );
  });

  it('allows an explicitly disposable database when it differs from the application database', () => {
    process.env.DATABASE_URL = 'postgresql://db.example.com/payroll';
    process.env.TEST_DATABASE_URL = 'postgresql://db.example.com/disposable_integration';
    process.env.TEST_DATABASE_DISPOSABLE = 'true';

    expect(requireIsolatedTestDatabaseUrl()).toBe(
      'postgresql://db.example.com/disposable_integration',
    );
  });

  it('ignores credentials, default ports, and URL options when comparing targets', () => {
    process.env.DATABASE_URL =
      'postgresql://application:first@db.example.com:5432/payroll_test?schema=public&sslmode=require';
    process.env.TEST_DATABASE_URL =
      'postgres://integration:second@DB.EXAMPLE.COM/payroll_test?schema=isolated&connect_timeout=5';

    expect(() => requireIsolatedTestDatabaseUrl()).toThrow(
      'Refusing database tests: TEST_DATABASE_URL targets the application database',
    );
  });

  it('compares the test target with DIRECT_URL as well as DATABASE_URL', () => {
    process.env.DATABASE_URL = 'postgresql://db.example.com/another_database';
    process.env.DIRECT_URL = 'postgresql://db.example.com/payroll_test';
    process.env.TEST_DATABASE_URL = 'postgresql://db.example.com/payroll_test';

    expect(() => requireIsolatedTestDatabaseUrl()).toThrow(
      'Refusing database tests: TEST_DATABASE_URL targets the application database',
    );
  });

  it('treats known Neon pooled and direct hostnames as the same endpoint', () => {
    process.env.DATABASE_URL =
      'postgresql://app:secret@ep-cool-glade-123.us-east-2.aws.neon.tech/payroll_test';
    process.env.TEST_DATABASE_URL =
      'postgresql://tests:secret@ep-cool-glade-123-pooler.us-east-2.aws.neon.tech/payroll_test';

    expect(() => requireIsolatedTestDatabaseUrl()).toThrow(
      'Refusing database tests: TEST_DATABASE_URL targets the application database',
    );
  });

  it('treats localhost IPv4 and IPv6 loopback hosts as equivalent', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/payroll_test';
    process.env.TEST_DATABASE_URL = 'postgresql://[::1]/payroll_test';

    expect(() => requireIsolatedTestDatabaseUrl()).toThrow(
      'Refusing database tests: TEST_DATABASE_URL targets the application database',
    );
  });

  it('allows a distinct database on the same host and port', () => {
    process.env.DATABASE_URL = 'postgresql://db.example.com:5432/payroll';
    process.env.TEST_DATABASE_URL = 'postgresql://db.example.com:5432/payroll_test';

    expect(requireIsolatedTestDatabaseUrl()).toBe(
      'postgresql://db.example.com:5432/payroll_test',
    );
  });

  it('allows the same database name on a distinct port', () => {
    process.env.DATABASE_URL = 'postgresql://localhost:5432/payroll_test';
    process.env.TEST_DATABASE_URL = 'postgresql://127.0.0.1:55432/payroll_test';

    expect(requireIsolatedTestDatabaseUrl()).toBe(
      'postgresql://127.0.0.1:55432/payroll_test',
    );
  });

  it('rejects a malformed application database URL without echoing it', () => {
    process.env.DATABASE_URL = 'malformed-application-url-containing-a-secret';
    process.env.TEST_DATABASE_URL = 'postgresql://localhost/payroll_test';

    expect(() => requireIsolatedTestDatabaseUrl()).toThrow(
      'DATABASE_URL must be a valid PostgreSQL URL',
    );
    expect(() => requireIsolatedTestDatabaseUrl()).not.toThrow(
      'malformed-application-url-containing-a-secret',
    );
  });
});
