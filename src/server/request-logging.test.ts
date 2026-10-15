import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/auth', () => ({ getAuth: vi.fn() }));
import { ApiError, route } from './http';
import { logAuthEvent } from './request-logging';

const requestId = 'd7f78b8a-4b3e-4b8a-9c77-c6d07b700742';
const secret = 'private-fixture-never-log';

describe('HTTP correlation and redaction', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('correlates the response and structured log without request or employee payloads', async () => {
    const response = await route<[Request]>(async () => Response.json({ salary: secret }))(new Request(
      `https://example.test/api/employees/private-employee-id?email=${secret}`, {
        headers: { 'x-request-id': requestId, cookie: secret, authorization: `Bearer ${secret}` },
      },
    ));
    expect(response.headers.get('x-request-id')).toBe(requestId);
    const output = vi.mocked(console.info).mock.calls;
    expect(output).toHaveLength(1);
    const event = JSON.parse(output[0][0]);
    expect(event).toMatchObject({ event: 'http_request', entryPoint: 'http', requestId,
      method: 'GET', route: '/api/employees/[id]', status: 200 });
    expect(event.durationMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(output)).not.toContain(secret);
    expect(JSON.stringify(output)).not.toContain('private-employee-id');
    expect(await response.json()).toEqual({ salary: secret });
  });

  it('generates a UUID when a caller sends an invalid or overlong ID', async () => {
    for (const supplied of [secret, 'a'.repeat(500), '']) {
      const response = await route<[Request]>(async () => new Response(null, { status: 204 }))(
        new Request('https://example.test/api/options', { headers: { 'x-request-id': supplied } }),
      );
      expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(response.status).toBe(204);
    }
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain(secret);
  });

  it('correlates denied and unexpected failures without logging exception contents', async () => {
    for (const error of [new ApiError(401, 'UNAUTHORIZED', 'A valid HR session is required'),
      Object.assign(new Error(secret), { name: secret })]) {
      const response = await route<[Request]>(async () => { throw error; })(
        new Request('https://example.test/api/session', { headers: { 'x-request-id': requestId } }),
      );
      expect(response.headers.get('x-request-id')).toBe(requestId);
      expect(response.status).toBe(error instanceof ApiError ? 401 : 500);
      expect(await response.text()).not.toContain(secret);
    }
    const output = [...vi.mocked(console.warn).mock.calls, ...vi.mocked(console.error).mock.calls];
    expect(output).toHaveLength(2);
    for (const line of output) expect(JSON.parse(line[0]).requestId).toBe(requestId);
    expect(JSON.stringify(output)).not.toContain(secret);
  });

  it('preserves cookies, redirects and the response when the log sink fails', async () => {
    vi.mocked(console.info).mockImplementation(() => { throw new Error('Log transport failed'); });
    const response = await route<[Request]>(async () => {
      const result = new Response(null, { status: 302, headers: { location: '/employees' } });
      result.headers.append('set-cookie', 'first=one; HttpOnly');
      result.headers.append('set-cookie', 'second=two; HttpOnly');
      return result;
    })(new Request('https://example.test/api/session'));
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/employees');
    expect(response.headers.getSetCookie()).toEqual(['first=one; HttpOnly', 'second=two; HttpOnly']);
    expect(response.headers.get('x-request-id')).toBeTruthy();
  });

  it('keeps authentication events attached to the correct overlapping request', async () => {
    const otherId = '06ab6d0c-0dd8-4c31-8da6-a667fc61a9e7';
    let release!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    const slow = route<[Request]>(async () => {
      await barrier;
      logAuthEvent('auth_warning');
      return Response.json({ ok: true });
    })(new Request('https://example.test/api/auth/sign-in/email', { headers: { 'x-request-id': requestId } }));
    await route<[Request]>(async () => {
      logAuthEvent('auth_warning');
      return Response.json({ ok: true });
    })(new Request('https://example.test/api/auth/sign-up/email', { headers: { 'x-request-id': otherId } }));
    release();
    await slow;
    const warnings = vi.mocked(console.warn).mock.calls.map(([line]) => JSON.parse(line));
    expect(warnings.map((event) => event.requestId)).toEqual([otherId, requestId]);
    expect(warnings.every((event) => event.entryPoint === 'http' && event.route === '/api/auth/[...all]')).toBe(true);
  });
});
