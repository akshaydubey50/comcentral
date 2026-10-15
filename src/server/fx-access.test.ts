import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ session: vi.fn(), refresh: vi.fn() }));
vi.mock('@/server/auth', () => ({ getAuth: () => ({ api: { getSession: mocks.session } }) }));
vi.mock('@/server/services/fx', () => ({ refreshFx: mocks.refresh }));

import { GET as cron } from '@/app/api/cron/fx/route';
import { POST as manual } from '@/app/api/fx/refresh/route';

const origin = 'http://localhost:3000';
const cronSecret = 'isolated-cron-authorization-fixture';

describe('FX refresh authorization', () => {
  beforeEach(() => {
    vi.stubEnv('BETTER_AUTH_URL', origin);
    vi.stubEnv('CRON_SECRET', cronSecret);
    mocks.session.mockReset().mockResolvedValue(null);
    mocks.refresh.mockReset().mockResolvedValue({ state: 'MISSING', available: false });
  });
  afterEach(() => vi.unstubAllEnvs());

  it('refuses missing and incorrect cron credentials before provider work', async () => {
    for (const authorization of ['', 'Bearer incorrect']) {
      expect((await cron(new Request(`${origin}/api/cron/fx`, { headers: { authorization } }))).status).toBe(401);
    }
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it('accepts the configured cron secret and returns refresh status', async () => {
    const response = await cron(new Request(`${origin}/api/cron/fx`, { headers: { authorization: `Bearer ${cronSecret}` } }));
    expect(response.status).toBe(200);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('requires an HR session and same-origin JSON for manual refresh', async () => {
    const request = (requestOrigin: string) => new Request(`${origin}/api/fx/refresh`, {
      method: 'POST', headers: { origin: requestOrigin, 'content-type': 'application/json' }, body: '{}',
    });
    expect((await manual(request(origin))).status).toBe(401);
    mocks.session.mockResolvedValue({ user: { id: 'hr', name: 'Test HR', email: 'hr@example.test' } });
    expect((await manual(request('https://foreign.example'))).status).toBe(403);
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect((await manual(request(origin))).status).toBe(200);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
});
