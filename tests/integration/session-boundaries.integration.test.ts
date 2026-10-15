import { randomInt, randomUUID } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { POST as authPost } from '../../src/app/api/auth/[...all]/route';
import { GET as employeeGet, PATCH as employeePatch } from '../../src/app/api/employees/[id]/route';
import { POST as employeesPost } from '../../src/app/api/employees/route';
import { getPrisma } from '../../src/server/db/prisma';
import type { PrismaClient } from '../../src/server/generated/prisma/client';
import { requireIsolatedTestDatabaseUrl } from './test-database';

const ORIGIN = 'http://localhost:3000';
const EMPLOYEE_CODE_PREFIX = 'S01-CLEAN-';
const EMPLOYEE_EMAIL_PREFIX = 's01-clean-';
const USER_EMAIL_PREFIX = 's01-user-';
const PASSWORD = 'session-boundary-test-password';

const ownedUserEmails = new Set<string>();
const ownedRateLimitKeys = new Set<string>();
let nextIp = randomInt(1, 0xffffff);
let prisma: PrismaClient;
let initialized = false;

function testIp(): string {
  const value = nextIp++;
  return `10.${(value >>> 16) & 255}.${(value >>> 8) & 255}.${value & 255}`;
}

function employeeInput(testKey: string) {
  return {
    employeeCode: `${EMPLOYEE_CODE_PREFIX}${testKey}`,
    name: 'Protected Employee',
    email: `${EMPLOYEE_EMAIL_PREFIX}${testKey}@example.invalid`,
    country: 'US',
    department: 'Engineering',
    jobRole: 'Engineer',
    employmentType: 'FULL_TIME',
    joiningDate: '2020-01-15',
    salary: '100000.00',
    currency: 'USD',
  } as const;
}

function cookieOf(response: Response): string {
  return response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
}

function authRequest(
  path: string,
  body: unknown,
  options: { cookie?: string; ip?: string } = {},
): Promise<Response> {
  const ip = options.ip ?? testIp();
  ownedRateLimitKeys.add(`${ip}|/${path}`);
  return authPost(new Request(`${ORIGIN}/api/auth/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: ORIGIN,
      'x-forwarded-for': ip,
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    body: JSON.stringify(body),
  }));
}

async function signUp(testKey: string): Promise<{ cookie: string; userId: string }> {
  const email = `${USER_EMAIL_PREFIX}${testKey}@example.invalid`;
  ownedUserEmails.add(email);
  const response = await authRequest('sign-up/email', {
    name: 'Session Boundary HR',
    email,
    password: PASSWORD,
  });
  expect(response.status).toBe(200);
  const cookie = cookieOf(response);
  expect(cookie).not.toBe('');
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { cookie, userId: user.id };
}

async function createProtectedEmployee(testKey: string) {
  return prisma.employee.create({
    data: {
      ...employeeInput(testKey),
      joiningDate: new Date('2020-01-15T00:00:00.000Z'),
    },
  });
}

async function expectProtectedRecordDenied(
  employee: Awaited<ReturnType<typeof createProtectedEmployee>>,
  cookie: string,
): Promise<void> {
  const input = employeeInput(
    employee.employeeCode.slice(EMPLOYEE_CODE_PREFIX.length),
  );
  const metadata = {
    employeeCode: input.employeeCode,
    name: input.name,
    email: input.email,
    country: input.country,
    department: input.department,
    jobRole: input.jobRole,
    employmentType: input.employmentType,
    joiningDate: input.joiningDate,
  };
  const read = await employeeGet(
    new Request(`${ORIGIN}/api/employees/${employee.id}`, { headers: { cookie } }),
    { params: Promise.resolve({ id: employee.id }) },
  );
  expect(read.status).toBe(401);
  await expect(read.json()).resolves.toMatchObject({ error: { code: 'UNAUTHORIZED' } });

  const mutation = await employeePatch(
    new Request(`${ORIGIN}/api/employees/${employee.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', origin: ORIGIN, cookie },
      body: JSON.stringify({
        ...metadata,
        name: 'Unauthorized Replacement',
        version: employee.version,
      }),
    }),
    { params: Promise.resolve({ id: employee.id }) },
  );
  expect(mutation.status).toBe(401);
  await expect(mutation.json()).resolves.toMatchObject({ error: { code: 'UNAUTHORIZED' } });

  const stored = await prisma.employee.findUniqueOrThrow({ where: { id: employee.id } });
  expect(stored).toMatchObject({ name: 'Protected Employee', version: employee.version });
}

async function expectSanitizedError(
  response: Response,
  status: number,
  code: string,
): Promise<void> {
  expect(response.status).toBe(status);
  expect(response.headers.get('cache-control')).toBe('no-store');
  const text = await response.text();
  expect(text).not.toContain('S01_PRIVATE_BODY_MARKER');
  expect(text).not.toContain('stack');
  expect(JSON.parse(text)).toEqual({
    error: { code, message: expect.any(String) },
  });
}

async function removeOwnedFixtures(): Promise<void> {
  await prisma.employee.deleteMany({
    where: {
      OR: [
        { employeeCode: { startsWith: EMPLOYEE_CODE_PREFIX } },
        { email: { startsWith: EMPLOYEE_EMAIL_PREFIX } },
      ],
    },
  });
  if (ownedUserEmails.size > 0) {
    await prisma.user.deleteMany({ where: { email: { in: [...ownedUserEmails] } } });
    ownedUserEmails.clear();
  }
  if (ownedRateLimitKeys.size > 0) {
    await prisma.rateLimit.deleteMany({ where: { key: { in: [...ownedRateLimitKeys] } } });
    ownedRateLimitKeys.clear();
  }
}

describe.sequential('session and protected request boundaries', () => {
  beforeAll(async () => {
    const testDatabaseUrl = requireIsolatedTestDatabaseUrl();
    vi.stubEnv('DATABASE_URL', testDatabaseUrl);
    vi.stubEnv('BETTER_AUTH_URL', ORIGIN);
    vi.stubEnv('BETTER_AUTH_SECRET', 'isolated-session-boundary-secret-at-least-32-characters');
    vi.stubEnv('NODE_ENV', 'test');
    prisma = getPrisma();
    initialized = true;
    await removeOwnedFixtures();
  });

  afterEach(async () => {
    if (initialized) await removeOwnedFixtures();
  });

  afterAll(async () => {
    if (initialized) await prisma.$disconnect();
    vi.unstubAllEnvs();
  });

  it('rejects controlled expired sessions for protected reads and mutations', async () => {
    const testKey = randomUUID().slice(0, 8);
    const { cookie, userId } = await signUp(`expired-${testKey}`);
    const employee = await createProtectedEmployee(`expired-${testKey}`);
    await prisma.session.updateMany({
      where: { userId },
      data: { expiresAt: new Date('2000-01-01T00:00:00.000Z') },
    });

    await expectProtectedRecordDenied(employee, cookie);
  });

  it('rejects a copied session cookie after logout for protected reads and mutations', async () => {
    const testKey = randomUUID().slice(0, 8);
    const { cookie, userId } = await signUp(`logout-${testKey}`);
    const employee = await createProtectedEmployee(`logout-${testKey}`);

    const logout = await authRequest('sign-out', {}, { cookie });
    expect(logout.status).toBe(200);
    expect(await prisma.session.count({ where: { userId } })).toBe(0);

    await expectProtectedRecordDenied(employee, cookie);
  });

  it('rejects unsafe protected mutations before employee data can be changed', async () => {
    const testKey = randomUUID().slice(0, 8);
    const { cookie } = await signUp(`request-${testKey}`);
    const input = employeeInput(`request-${testKey}`);
    const endpoint = `${ORIGIN}/api/employees`;
    const body = JSON.stringify(input);
    const cases = [
      {
        request: new Request(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json', cookie },
          body,
        }),
        status: 403,
        code: 'ORIGIN_REJECTED',
      },
      {
        request: new Request(endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            origin: 'https://example.invalid',
            cookie,
          },
          body,
        }),
        status: 403,
        code: 'ORIGIN_REJECTED',
      },
      {
        request: new Request(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'text/plain', origin: ORIGIN, cookie },
          body,
        }),
        status: 415,
        code: 'UNSUPPORTED_MEDIA_TYPE',
      },
      {
        request: new Request(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: ORIGIN, cookie },
          body: JSON.stringify({ ...input, name: `S01_PRIVATE_BODY_MARKER${'x'.repeat(70 * 1024)}` }),
        }),
        status: 413,
        code: 'PAYLOAD_TOO_LARGE',
      },
    ];

    for (const testCase of cases) {
      await expectSanitizedError(
        await employeesPost(testCase.request),
        testCase.status,
        testCase.code,
      );
    }
    expect(await prisma.employee.count({ where: { employeeCode: input.employeeCode } })).toBe(0);
  });

  it('persists the sign-in throttle and rejects the eleventh attempt in its window', async () => {
    const testKey = randomUUID().slice(0, 8);
    const ip = testIp();
    const rateLimitKey = `${ip}|/sign-in/email`;
    ownedRateLimitKeys.add(rateLimitKey);
    const credentials = {
      email: `${USER_EMAIL_PREFIX}missing-${testKey}@example.invalid`,
      password: PASSWORD,
    };

    for (let attempt = 0; attempt < 10; attempt++) {
      expect((await authRequest('sign-in/email', credentials, { ip })).status).toBe(401);
    }
    const persisted = await prisma.rateLimit.findUniqueOrThrow({ where: { key: rateLimitKey } });
    expect(persisted.count).toBe(10);
    expect(persisted.lastRequest).toBeGreaterThan(0n);

    const limited = await authRequest('sign-in/email', credentials, { ip });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('x-retry-after'))).toBeGreaterThan(0);
    expect((await prisma.rateLimit.findUniqueOrThrow({ where: { key: rateLimitKey } })).count).toBe(10);
  });
});
