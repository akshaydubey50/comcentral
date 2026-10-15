import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  userId: 'S03-unset',
  getSession: vi.fn(),
  getInsights: vi.fn(),
  exportEmployees: vi.fn(),
}));

vi.mock('@/server/auth', () => ({
  getAuth: () => ({ api: { getSession: mocks.getSession } }),
}));
vi.mock('@/server/services/insights', () => ({ getInsights: mocks.getInsights }));
vi.mock('@/server/services/imports', () => ({ exportEmployees: mocks.exportEmployees }));

import { GET as exportGet } from '../../src/app/api/employees/export/route';
import { GET as insightsGet } from '../../src/app/api/insights/route';
import { getPrisma } from '../../src/server/db/prisma';
import type { PrismaClient } from '../../src/server/generated/prisma/client';
import {
  EMPLOYEE_EXPORT_REQUEST_LIMIT,
  INSIGHTS_REQUEST_LIMIT,
} from '../../src/server/rate-limit';
import { requireIsolatedTestDatabaseUrl } from './test-database';

const ORIGIN = 'http://localhost:3000';
const OWNED_KEY_PREFIXES = ['app|user|insights|S03-', 'app|user|employee-export|S03-'];

let prisma: PrismaClient;
let initialized = false;

function request(path: string, attempt: number): Request {
  return new Request(`${ORIGIN}${path}?status=ACTIVE`, {
    headers: { 'x-forwarded-for': `198.51.100.${(attempt % 250) + 1}` },
  });
}

async function removeOwnedLimits(): Promise<void> {
  await prisma.rateLimit.deleteMany({
    where: { OR: OWNED_KEY_PREFIXES.map((prefix) => ({ key: { startsWith: prefix } })) },
  });
}

describe.sequential('durable authenticated report admission limits', () => {
  beforeAll(async () => {
    const databaseUrl = requireIsolatedTestDatabaseUrl();
    vi.stubEnv('DATABASE_URL', databaseUrl);
    prisma = getPrisma();
    initialized = true;
    await removeOwnedLimits();
  });

  beforeEach(() => {
    mocks.userId = `S03-${crypto.randomUUID()}`;
    mocks.getSession.mockReset();
    mocks.getInsights.mockReset();
    mocks.exportEmployees.mockReset();
    mocks.getSession.mockImplementation(async () => ({
      user: { id: mocks.userId, name: 'Limit Tester', email: 's03@example.invalid' },
    }));
    mocks.getInsights.mockResolvedValue({ asOf: '2026-10-15', currencies: [] });
    mocks.exportEmployees.mockResolvedValue('employeeCode,name\n');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    if (initialized) await removeOwnedLimits();
  });

  afterAll(async () => {
    if (initialized) await prisma.$disconnect();
    vi.unstubAllEnvs();
  });

  it('admits thirty insights requests then rejects before report processing', async () => {
    const accepted = await Promise.all(Array.from({ length: INSIGHTS_REQUEST_LIMIT.limit }, (_, index) =>
      insightsGet(request('/api/insights', index))));
    expect(accepted.every((response) => response.status === 200)).toBe(true);

    const denied = await insightsGet(request('/api/insights', 100));

    expect(denied.status).toBe(429);
    await expect(denied.json()).resolves.toMatchObject({ error: { code: 'RATE_LIMITED' } });
    expect(Number(denied.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(mocks.getInsights).toHaveBeenCalledTimes(INSIGHTS_REQUEST_LIMIT.limit);
  });

  it('admits six exports, keeps report scope independent, and rejects before export processing', async () => {
    for (let attempt = 0; attempt < EMPLOYEE_EXPORT_REQUEST_LIMIT.limit; attempt += 1) {
      expect((await exportGet(request('/api/employees/export', attempt))).status).toBe(200);
    }
    expect((await insightsGet(request('/api/insights', 200))).status).toBe(200);

    const denied = await exportGet(request('/api/employees/export', 201));

    expect(denied.status).toBe(429);
    await expect(denied.json()).resolves.toEqual({
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
    });
    expect(mocks.exportEmployees).toHaveBeenCalledTimes(EMPLOYEE_EXPORT_REQUEST_LIMIT.limit);
    expect(mocks.getInsights).toHaveBeenCalledTimes(1);
  });

  it('does not consume a durable limit before session authentication', async () => {
    mocks.getSession.mockResolvedValue(null);

    expect((await exportGet(request('/api/employees/export', 1))).status).toBe(401);
    expect((await insightsGet(request('/api/insights', 2))).status).toBe(401);

    expect(await prisma.rateLimit.count({
      where: { OR: OWNED_KEY_PREFIXES.map((prefix) => ({ key: { startsWith: prefix } })) },
    })).toBe(0);
    expect(mocks.exportEmployees).not.toHaveBeenCalled();
    expect(mocks.getInsights).not.toHaveBeenCalled();
  });
});
