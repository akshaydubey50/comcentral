import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';

afterEach(() => vi.unstubAllEnvs());

describe('document security policy', () => {
  it('uses a fresh nonce and replaces caller-supplied rendering headers', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const request = new NextRequest('https://example.test/register', {
      headers: { 'x-nonce': 'caller-value', 'Content-Security-Policy': "script-src * 'unsafe-inline'" },
    });
    const first = proxy(request);
    const second = proxy(request);
    const policy = first.headers.get('content-security-policy')!;
    expect(policy).toContain("script-src 'self' 'nonce-");
    expect(policy).toContain("'strict-dynamic'");
    expect(policy).toContain("style-src-attr 'unsafe-inline'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain('upgrade-insecure-requests');
    expect(policy).not.toContain('unsafe-eval');
    expect(policy).not.toContain('caller-value');
    expect(policy).not.toEqual(second.headers.get('content-security-policy'));
    expect(first.headers.get('x-middleware-request-content-security-policy')).toBe(policy);
    const nonce = first.headers.get('x-middleware-request-x-nonce')!;
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(policy).toContain(`'nonce-${nonce}'`);
  });

  it('limits development eval/websocket allowances to development and keeps local HTTP usable', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const policy = proxy(new NextRequest('http://localhost:3000/login')).headers.get('content-security-policy')!;
    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain('ws: wss:');
    expect(policy).not.toContain('upgrade-insecure-requests');
  });
});
