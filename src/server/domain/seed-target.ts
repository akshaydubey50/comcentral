type SeedEnvironment = Record<string, string | undefined>;

export class SeedSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedSafetyError';
  }
}

/**
 * Validates the complete seed target acknowledgement without opening a database connection.
 */
export function requireSafeSeedDatabaseUrl(environment: SeedEnvironment): string {
  if (environment.NODE_ENV === 'production') {
    throw new SeedSafetyError('Refusing synthetic seed in production');
  }

  const target = environment.COMCENTRAL_SEED_TARGET;
  if (target !== 'demo' && target !== 'test') {
    throw new SeedSafetyError('COMCENTRAL_SEED_TARGET must be explicitly set to demo or test');
  }

  const databaseUrl = environment.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new SeedSafetyError('DATABASE_URL is required for synthetic seeding');
  }

  const databaseName = parseSeedDatabaseName(databaseUrl);
  if (!databaseName.toLowerCase().endsWith(`_${target}`)) {
    throw new SeedSafetyError(`A ${target} seed target database must end with _${target}`);
  }
  if (environment.COMCENTRAL_SEED_DATABASE_ACK !== databaseName) {
    throw new SeedSafetyError(
      'COMCENTRAL_SEED_DATABASE_ACK must exactly match the seed database name',
    );
  }

  return databaseUrl;
}

function parseSeedDatabaseName(databaseUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new SeedSafetyError(
      'DATABASE_URL must be a valid PostgreSQL target for synthetic seeding',
    );
  }

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname) {
    throw new SeedSafetyError(
      'DATABASE_URL must be a valid PostgreSQL target for synthetic seeding',
    );
  }
  // pg treats these exact keys as authority replacements (or a nested URL).
  // TLS, schema, and options parameters do not select a different target.
  for (const key of parsed.searchParams.keys()) {
    if (key === 'host' || key === 'port' || key === 'connectionString') {
      throw new SeedSafetyError(
        'DATABASE_URL must not override its seed target through URL parameters',
      );
    }
  }

  let databaseName: string;
  try {
    databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  } catch {
    throw new SeedSafetyError('DATABASE_URL must include a database name for synthetic seeding');
  }
  if (!databaseName) {
    throw new SeedSafetyError('DATABASE_URL must include a database name for synthetic seeding');
  }
  return databaseName;
}
