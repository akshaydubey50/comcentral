import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkReadiness } from '@/server/readiness';

vi.mock('@/server/readiness', () => ({ checkReadiness: vi.fn() }));

import { GET } from './route';

const request = () => new Request('http://localhost/api/ready');

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('GET /api/ready', () => {
  it('returns the minimal public healthy response', async () => {
    vi.mocked(checkReadiness).mockResolvedValue({ status: 'ready' });

    const response = await GET(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ready' });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it.each(['configuration', 'database', 'timeout'] as const)(
    'hides the %s diagnosis from the public unavailable response',
    async (cause) => {
      vi.mocked(checkReadiness).mockResolvedValue({ status: 'unavailable', cause });

      const response = await GET(request());

      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toEqual({ status: 'unavailable' });
    },
  );
});
