type DatabaseIdentity = {
  hostname: string;
  port: string;
  databaseName: string;
};

function normalizeHostname(hostname: string): string {
  const normalized = hostname.toLowerCase().replace(/\.$/, '');
  const unbracketed = normalized.replace(/^\[(.*)\]$/, '$1');

  if (
    unbracketed === 'localhost' ||
    unbracketed === '::1' ||
    unbracketed === '0:0:0:0:0:0:0:1' ||
    /^127(?:\.\d{1,3}){3}$/.test(unbracketed)
  ) {
    return 'loopback';
  }

  if (normalized.endsWith('.neon.tech')) {
    const [endpoint, ...domain] = normalized.split('.');
    return [endpoint.replace(/-pooler$/, ''), ...domain].join('.');
  }

  return normalized;
}

function parseDatabaseIdentity(raw: string, variableName: string): DatabaseIdentity {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL`);
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error(`${variableName} must use PostgreSQL`);
  }
  if (!parsed.hostname) throw new Error(`${variableName} must include a host`);

  let databaseName: string;
  try {
    databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  } catch {
    throw new Error(`${variableName} must include a valid database name`);
  }
  if (!databaseName) throw new Error(`${variableName} must include a database name`);

  return {
    hostname: normalizeHostname(parsed.hostname),
    port: parsed.port || '5432',
    databaseName,
  };
}

function targetsSameDatabase(left: DatabaseIdentity, right: DatabaseIdentity): boolean {
  return (
    left.hostname === right.hostname &&
    left.port === right.port &&
    left.databaseName === right.databaseName
  );
}

export function requireIsolatedTestDatabaseUrl(): string {
  const raw = process.env.TEST_DATABASE_URL?.trim();
  if (!raw) throw new Error('TEST_DATABASE_URL is required for database integration tests');

  const testIdentity = parseDatabaseIdentity(raw, 'TEST_DATABASE_URL');
  for (const variableName of ['DATABASE_URL', 'DIRECT_URL'] as const) {
    const applicationUrl = process.env[variableName]?.trim();
    if (!applicationUrl) continue;

    const applicationIdentity = parseDatabaseIdentity(applicationUrl, variableName);
    if (targetsSameDatabase(testIdentity, applicationIdentity)) {
      throw new Error(
        'Refusing database tests: TEST_DATABASE_URL targets the application database',
      );
    }
  }

  const explicitlyDisposable = process.env.TEST_DATABASE_DISPOSABLE === 'true';
  if (!testIdentity.databaseName.toLowerCase().endsWith('_test') && !explicitlyDisposable) {
    throw new Error(
      'Refusing database tests: database name must end in _test or TEST_DATABASE_DISPOSABLE=true',
    );
  }
  return raw;
}
