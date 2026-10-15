import { Client } from 'pg';

import { applicationOrigin, ConfigurationError, requireEnvironment } from '@/server/config';

const DEFAULT_TIMEOUT_MS = 2_000;

export type ReadinessResult =
  | { status: 'ready' }
  | { status: 'unavailable'; cause: 'configuration' | 'database' | 'timeout' };

type DatabaseProbe = (databaseUrl: string, timeoutMs: number) => Promise<unknown>;

class ReadinessTimeoutError extends Error {}

function configuredDatabaseUrl(): string {
  const configured = requireEnvironment('DATABASE_URL');
  try {
    const parsed = new URL(configured);
    if (
      !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
      !parsed.hostname ||
      !parsed.pathname ||
      parsed.pathname === '/'
    ) {
      throw new Error('invalid database URL');
    }
  } catch {
    throw new ConfigurationError('DATABASE_URL must be a PostgreSQL URL with a database name');
  }
  return configured;
}

function validateCoreRuntimeConfiguration(): void {
  applicationOrigin();
  if (requireEnvironment('BETTER_AUTH_SECRET').length < 32) {
    throw new ConfigurationError('BETTER_AUTH_SECRET must contain at least 32 characters');
  }
}

async function probeDatabase(databaseUrl: string, timeoutMs: number): Promise<void> {
  const client = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: timeoutMs,
    query_timeout: timeoutMs,
    statement_timeout: timeoutMs,
    application_name: 'comcentral-readiness',
  });
  try {
    await client.connect();
    await client.query('SELECT 1');
  } finally {
    await client.end().catch(() => undefined);
  }
}

/** Check required database configuration and connectivity without returning sensitive diagnostics. */
export async function checkReadiness(options: {
  probe?: DatabaseProbe;
  timeoutMs?: number;
} = {}): Promise<ReadinessResult> {
  try {
    const databaseUrl = configuredDatabaseUrl();
    validateCoreRuntimeConfiguration();
    const timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        (options.probe ?? probeDatabase)(databaseUrl, timeoutMs),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new ReadinessTimeoutError()), timeoutMs);
        }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
    return { status: 'ready' };
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return { status: 'unavailable', cause: 'configuration' };
    }
    if (error instanceof ReadinessTimeoutError) {
      return { status: 'unavailable', cause: 'timeout' };
    }
    return { status: 'unavailable', cause: 'database' };
  }
}
