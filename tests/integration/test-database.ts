export function requireIsolatedTestDatabaseUrl(): string {
  const raw = process.env.TEST_DATABASE_URL?.trim();
  if (!raw) throw new Error('TEST_DATABASE_URL is required for database integration tests');

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL URL');
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('TEST_DATABASE_URL must use PostgreSQL');
  }
  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  const explicitlyDisposable = process.env.TEST_DATABASE_DISPOSABLE === 'true';
  if (!databaseName.toLowerCase().endsWith('_test') && !explicitlyDisposable) {
    throw new Error(
      'Refusing database tests: database name must end in _test or TEST_DATABASE_DISPOSABLE=true',
    );
  }
  return raw;
}
