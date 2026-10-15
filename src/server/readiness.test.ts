import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkReadiness } from '@/server/readiness';

const validDatabaseUrl = 'postgresql://localhost/comcentral_readiness_test';

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', validDatabaseUrl);
  vi.stubEnv('BETTER_AUTH_URL', 'http://localhost:3000');
  vi.stubEnv('BETTER_AUTH_SECRET', 'readiness-test-secret-over-32-characters');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('checkReadiness', () => {
  it('reports ready after a successful bounded database probe', async () => {
    const probe = vi.fn().mockResolvedValue(undefined);

    await expect(checkReadiness({ probe, timeoutMs: 100 })).resolves.toEqual({ status: 'ready' });
    expect(probe).toHaveBeenCalledWith(validDatabaseUrl, 100);
  });

  it.each([undefined, 'not-a-database-url', 'https://db.example.invalid/database', 'postgresql://localhost'])(
    'reports sanitized configuration failure for %s',
    async (databaseUrl) => {
      if (databaseUrl === undefined) vi.stubEnv('DATABASE_URL', '');
      else vi.stubEnv('DATABASE_URL', databaseUrl);
      const probe = vi.fn();

      const result = await checkReadiness({ probe });

      expect(result).toEqual({ status: 'unavailable', cause: 'configuration' });
      expect(JSON.stringify(result)).not.toContain(databaseUrl ?? 'password');
      expect(probe).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['BETTER_AUTH_URL', '', ''],
    ['BETTER_AUTH_URL', 'private-token', 'private-token'],
    ['BETTER_AUTH_SECRET', '', ''],
    ['BETTER_AUTH_SECRET', 'short-secret', 'short-secret'],
  ])('reports sanitized configuration failure for invalid %s', async (name, value, sensitiveValue) => {
    vi.stubEnv(name, value);
    const probe = vi.fn();

    const result = await checkReadiness({ probe });

    expect(result).toEqual({ status: 'unavailable', cause: 'configuration' });
    expect(JSON.stringify(result)).not.toContain(sensitiveValue || 'password');
    expect(probe).not.toHaveBeenCalled();
  });

  it('does not expose rejected database error details', async () => {
    const probe = vi.fn().mockRejectedValue(new Error('password=readiness-secret host=private-db'));

    const result = await checkReadiness({ probe, timeoutMs: 100 });

    expect(result).toEqual({ status: 'unavailable', cause: 'database' });
    expect(JSON.stringify(result)).not.toMatch(/readiness-secret|private-db/);
  });

  it('returns within its deadline when a probe never settles', async () => {
    vi.useFakeTimers();
    const readiness = checkReadiness({ probe: () => new Promise(() => undefined), timeoutMs: 25 });

    await vi.advanceTimersByTimeAsync(25);

    await expect(readiness).resolves.toEqual({ status: 'unavailable', cause: 'timeout' });
  });
});
