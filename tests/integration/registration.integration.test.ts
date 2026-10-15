import { randomInt, randomUUID } from 'node:crypto';

import { verifyPassword } from 'better-auth/crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { POST as authPost } from '../../src/app/api/auth/[...all]/route';
import { GET as employeesGet } from '../../src/app/api/employees/route';
import { GET as sessionGet } from '../../src/app/api/session/route';
import { getProvisioningAuth } from '../../src/server/auth';
import { getPrisma } from '../../src/server/db/prisma';
import type { PrismaClient } from '../../src/server/generated/prisma/client';
import { requireIsolatedTestDatabaseUrl } from './test-database';

const origin = 'http://localhost:3000';
const password = '  integration-only-password  ';
const emails: string[] = [];
let prisma: PrismaClient | undefined;
let nextIp = randomInt(1, 0xffffff);

function testIp(): string {
  const value = nextIp++;
  return `10.${(value >>> 16) & 255}.${(value >>> 8) & 255}.${value & 255}`;
}

function identity(label: string) {
  const email = `${label}-${randomUUID()}@example.test`;
  emails.push(email);
  return { name: 'Registration HR', email, password };
}

/** Each case gets a separate test IP so only the throttling case shares a bucket. */
function post(path: string, body: unknown, options: { ip?: string; cookie?: string } = {}) {
  return authPost(new Request(`${origin}/api/auth/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json', origin,
      'x-forwarded-for': options.ip ?? testIp(),
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    body: JSON.stringify(body),
  }));
}

function cookieOf(response: Response): string {
  return response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
}

describe('PostgreSQL public HR registration', () => {
  beforeAll(() => {
    // Validate against the original app URLs before redirecting the lazy Prisma client.
    const testDatabaseUrl = requireIsolatedTestDatabaseUrl();
    vi.stubEnv('DATABASE_URL', testDatabaseUrl);
    vi.stubEnv('BETTER_AUTH_URL', origin);
    vi.stubEnv('BETTER_AUTH_SECRET', 'isolated-registration-test-secret-at-least-32-characters');
    vi.stubEnv('NODE_ENV', 'test');
    prisma = getPrisma();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
      await prisma.$disconnect();
    }
    vi.unstubAllEnvs();
  });

  it('creates normalized credentials and a usable cookie, then supports logout and login', async () => {
    const input = identity('session');
    const response = await post('sign-up/email', {
      ...input, name: '  Registration HR  ', email: `  ${input.email.toUpperCase()}  `,
    });
    expect(response.status).toBe(200);
    const user = await prisma!.user.findUniqueOrThrow({ where: { email: input.email }, include: { accounts: true, sessions: true } });
    expect(user.name).toBe('Registration HR');
    expect(user.emailVerified).toBe(false);
    expect(user.accounts).toHaveLength(1);
    expect(user.sessions).toHaveLength(1);
    expect(await verifyPassword({ hash: user.accounts[0].password!, password })).toBe(true);
    const cookie = cookieOf(response);
    expect(Boolean(cookie)).toBe(true);
    expect(response.headers.getSetCookie().some((value) => /httponly/i.test(value))).toBe(true);
    expect(response.headers.getSetCookie().some((value) => /samesite=lax/i.test(value))).toBe(true);
    const session = await sessionGet(new Request(`${origin}/api/session`, { headers: { cookie } }));
    expect((await session.json()).user.id).toBe(user.id);
    expect((await employeesGet(new Request(`${origin}/api/employees`, { headers: { cookie } }))).status).toBe(200);
    expect((await employeesGet(new Request(`${origin}/api/employees`))).status).toBe(401);
    expect((await post('sign-out', {}, { cookie })).status).toBe(200);
    expect((await (await sessionGet(new Request(`${origin}/api/session`, { headers: { cookie } }))).json()).user).toBeNull();
    expect((await post('sign-in/email', { email: input.email, password })).status).toBe(200);
  });

  it('rejects normalized duplicates without replacing credentials or creating sessions', async () => {
    const input = identity('duplicate');
    expect((await post('sign-up/email', input)).status).toBe(200);
    const before = await prisma!.user.findUniqueOrThrow({ where: { email: input.email }, include: { accounts: true, sessions: true } });
    const response = await post('sign-up/email', { ...input, email: ` ${input.email.toUpperCase()} `, password: 'different-test-password' });
    expect(response.status).toBe(422);
    expect((await response.json()).code).toBe('USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL');
    expect(Boolean(cookieOf(response))).toBe(false);
    const after = await prisma!.user.findUniqueOrThrow({ where: { email: input.email }, include: { accounts: true, sessions: true } });
    expect(after.accounts).toHaveLength(1);
    expect(after.sessions).toHaveLength(before.sessions.length);
    expect(after.accounts[0].password === before.accounts[0].password).toBe(true);
  });

  it('enforces the five-character boundary and accepts the same password after logout', async () => {
    const input = identity('password-boundary');
    const rejected = await post('sign-up/email', { ...input, password: 'aB3!' });
    expect(rejected.status).toBe(422);
    expect(await prisma!.user.count({ where: { email: input.email } })).toBe(0);
    expect(Boolean(cookieOf(rejected))).toBe(false);

    const accepted = await post('sign-up/email', { ...input, password: 'aB3!x' });
    expect(accepted.status).toBe(200);
    const cookie = cookieOf(accepted);
    const session = await sessionGet(new Request(`${origin}/api/session`, { headers: { cookie } }));
    expect((await session.json()).user?.email).toBe(input.email);
    expect((await post('sign-out', {}, { cookie })).status).toBe(200);
    const signedIn = await post('sign-in/email', { email: input.email, password: 'aB3!x' });
    expect(signedIn.status).toBe(200);
    expect(Boolean(cookieOf(signedIn))).toBe(true);
  });

  it('allows only one concurrent registration for an email', async () => {
    const input = identity('concurrent');
    const responses = await Promise.all([post('sign-up/email', input), post('sign-up/email', input)]);
    expect(responses.filter((response) => response.status === 200)).toHaveLength(1);
    expect(responses.filter((response) => response.status >= 400)).toHaveLength(1);
    const user = await prisma!.user.findUniqueOrThrow({ where: { email: input.email }, include: { accounts: true, sessions: true } });
    expect(user.accounts).toHaveLength(1);
    expect(user.sessions).toHaveLength(1);
  });

  it('rejects invalid fields and client-supplied privileges before creating an account', async () => {
    const input = identity('invalid');
    for (const body of [
      { ...input, name: ' ' }, { ...input, email: 'invalid' },
      { ...input, password: '1234' }, { ...input, password: 'x'.repeat(129) },
      { ...input, role: 'admin' }, { ...input, callbackURL: 'https://example.invalid' },
    ]) expect((await post('sign-up/email', body)).status).toBe(422);
    expect(await prisma!.user.count({ where: { email: input.email } })).toBe(0);
  });

  it('rejects unsafe origins, media types, malformed JSON and oversized bodies', async () => {
    const input = identity('boundary');
    for (const [headers, body, status] of [
      [{ 'content-type': 'application/json' }, JSON.stringify(input), 403],
      [{ 'content-type': 'application/json', origin: 'https://example.invalid' }, JSON.stringify(input), 403],
      [{ 'content-type': 'text/plain', origin }, JSON.stringify(input), 415],
      [{ 'content-type': 'application/json', origin }, '{', 400],
      [{ 'content-type': 'application/json', origin }, JSON.stringify({ ...input, name: 'x'.repeat(4096) }), 413],
    ] as const) {
      const response = await authPost(new Request(`${origin}/api/auth/sign-up/email`, { method: 'POST', headers, body }));
      expect(response.status).toBe(status);
    }
    expect(await prisma!.user.count({ where: { email: input.email } })).toBe(0);
  });

  it.each(['account', 'session'] as const)('rolls back all registration writes if the %s insert fails', async (table) => {
    const input = identity(`rollback-${table}`);
    // NOT VALID leaves existing fixtures intact but deliberately rejects new rows.
    // These fixed SQL statements run only after the isolated-database guard above.
    const constraint = `registration_test_reject_${table}`;
    await prisma!.$executeRawUnsafe(`ALTER TABLE "${table}" ADD CONSTRAINT "${constraint}" CHECK (false) NOT VALID`);
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await post('sign-up/email', input);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(Boolean(cookieOf(response))).toBe(false);
      expect(await prisma!.user.count({ where: { email: input.email } })).toBe(0);
      expect(await prisma!.account.count({ where: { user: { email: input.email } } })).toBe(0);
      expect(await prisma!.session.count({ where: { user: { email: input.email } } })).toBe(0);
      expect(errorLog.mock.calls.length).toBeGreaterThan(0);
      const events = errorLog.mock.calls.map((args) => {
        expect(args).toHaveLength(1);
        expect(typeof args[0]).toBe('string');
        return JSON.parse(args[0] as string) as Record<string, unknown>;
      });
      for (const event of events) {
        expect(event).toMatchObject({
          entryPoint: 'http',
          method: 'POST',
          route: '/api/auth/[...all]',
          requestId: expect.any(String),
          timestamp: expect.any(String),
        });
        if (event.event === 'auth_internal_error') {
          expect(Object.keys(event).sort()).toEqual(
            ['entryPoint', 'event', 'method', 'requestId', 'route', 'timestamp'].sort(),
          );
        } else {
          expect(event).toMatchObject({
            event: 'http_request',
            status: 500,
            durationMs: expect.any(Number),
          });
          expect(Object.keys(event).sort()).toEqual(
            [
              'durationMs',
              'entryPoint',
              'event',
              'method',
              'requestId',
              'route',
              'status',
              'timestamp',
            ].sort(),
          );
        }
      }
      expect(events.some((event) => event.event === 'auth_internal_error')).toBe(true);
      expect(events.some((event) => event.event === 'http_request')).toBe(true);
      const serializedLogs = JSON.stringify(errorLog.mock.calls);
      expect(serializedLogs).not.toContain(input.email);
      expect(serializedLogs).not.toContain(input.password);
      expect(serializedLogs).not.toContain(constraint);
      expect(serializedLogs).not.toMatch(/violates check constraint/i);
    } finally {
      errorLog.mockRestore();
      await prisma!.$executeRawUnsafe(`ALTER TABLE "${table}" DROP CONSTRAINT "${constraint}"`);
    }
  });

  it('keeps CLI provisioning session-free', async () => {
    const input = identity('provisioning');
    await getProvisioningAuth().api.signUpEmail({ body: input });
    const user = await prisma!.user.findUniqueOrThrow({ where: { email: input.email }, include: { accounts: true, sessions: true } });
    expect(user.accounts).toHaveLength(1);
    expect(user.sessions).toHaveLength(0);
  });

  it('throttles the sixth signup request from the same IP', async () => {
    const input = identity('rate-limit');
    const ip = testIp();
    expect((await post('sign-up/email', input, { ip })).status).toBe(200);
    for (let attempt = 0; attempt < 4; attempt++) {
      expect((await post('sign-up/email', input, { ip })).status).toBe(422);
    }
    const limited = await post('sign-up/email', input, { ip });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('x-retry-after'))).toBeGreaterThan(0);
  });
});
