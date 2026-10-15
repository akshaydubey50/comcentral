import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  userId: 'S03-unset',
  getSession: vi.fn(),
  previewImport: vi.fn(),
  commitImport: vi.fn(),
}));

vi.mock('@/server/auth', () => ({
  getAuth: () => ({ api: { getSession: mocks.getSession } }),
}));
vi.mock('@/server/services/imports', () => ({
  previewImport: mocks.previewImport,
  commitImport: mocks.commitImport,
}));

import { POST as commitPost } from '../../src/app/api/imports/commit/route';
import { POST as previewPost } from '../../src/app/api/imports/preview/route';
import { getPrisma } from '../../src/server/db/prisma';
import type { PrismaClient } from '../../src/server/generated/prisma/client';
import {
  consumeAuthenticatedRequestLimit,
  IMPORT_REQUEST_LIMIT,
} from '../../src/server/rate-limit';
import { requireIsolatedTestDatabaseUrl } from './test-database';

const ORIGIN = 'http://localhost:3000';
const KEY_PREFIX = 'app|user|imports|S03-';
const validPreviewBody = { csvText: 'employeeCode\nS03-001' };
const validCommitBody = {
  ...validPreviewBody,
  previewHash: 'a'.repeat(64),
  confirmed: true,
};

function tenThousandRowCsv(): string {
  const header = 'employeeCode,name,email,country,department,jobRole,employmentType,joiningDate,salary,currency';
  const rows = Array.from({ length: 10_000 }, (_, index) => {
    const sequence = String(index + 1).padStart(5, '0');
    return `S03-${sequence},Employee ${sequence},s03-${sequence}@example.invalid,US,Engineering,Engineer,FULL_TIME,2020-01-15,60000.00,USD`;
  });
  return [header, ...rows].join('\n');
}

let prisma: PrismaClient;
let initialized = false;

function request(body: unknown, forwardedFor: string, raw = false): Request {
  return new Request(`${ORIGIN}/api/imports/preview`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: ORIGIN,
      'x-forwarded-for': forwardedFor,
    },
    body: raw ? String(body) : JSON.stringify(body),
  });
}

async function removeOwnedLimits(): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { key: { startsWith: KEY_PREFIX } } });
}

describe.sequential('durable authenticated import admission limits', () => {
  beforeAll(async () => {
    const databaseUrl = requireIsolatedTestDatabaseUrl();
    vi.stubEnv('DATABASE_URL', databaseUrl);
    vi.stubEnv('BETTER_AUTH_URL', ORIGIN);
    vi.stubEnv('BETTER_AUTH_SECRET', 'isolated-import-limit-secret-at-least-32-characters');
    prisma = getPrisma();
    initialized = true;
    await removeOwnedLimits();
  });

  beforeEach(() => {
    mocks.userId = `S03-${crypto.randomUUID()}`;
    mocks.getSession.mockReset();
    mocks.previewImport.mockReset();
    mocks.commitImport.mockReset();
    mocks.getSession.mockImplementation(async () => ({
      user: { id: mocks.userId, name: 'Limit Tester', email: 's03@example.invalid' },
    }));
    mocks.previewImport.mockResolvedValue({ valid: true, totalRows: 1, previewRows: [], errors: [] });
    mocks.commitImport.mockResolvedValue({ imported: 1 });
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

  it('admits one legitimate maximum-row preview as one request', async () => {
    const csvText = tenThousandRowCsv();

    const response = await previewPost(request({ csvText }, '198.51.100.10'));

    expect(response.status).toBe(200);
    expect(mocks.previewImport).toHaveBeenCalledWith(csvText);
    await expect(prisma.rateLimit.findUniqueOrThrow({
      where: { key: `${KEY_PREFIX}${mocks.userId.slice(4)}` },
    })).resolves.toMatchObject({ count: 1 });
  });

  it('shares six admissions across preview and commit and rejects before parsing expensive input', async () => {
    const accepted: Response[] = [];
    for (let attempt = 0; attempt < IMPORT_REQUEST_LIMIT.limit; attempt += 1) {
      const forwardedFor = `198.51.100.${attempt + 1}`;
      accepted.push(attempt % 2 === 0
        ? await previewPost(request(validPreviewBody, forwardedFor))
        : await commitPost(request(validCommitBody, forwardedFor)));
    }
    expect(accepted.map((response) => response.status)).toEqual([200, 201, 200, 201, 200, 201]);

    const admittedRow = await prisma.rateLimit.findFirstOrThrow({
      where: { key: `${KEY_PREFIX}${mocks.userId.slice(4)}` },
    });
    expect(admittedRow.count).toBe(IMPORT_REQUEST_LIMIT.limit);

    const denied = await previewPost(request('malformed JSON must not be parsed', '203.0.113.99', true));
    expect(denied.status).toBe(429);
    await expect(denied.json()).resolves.toEqual({
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
    });
    expect(Number(denied.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(Number(denied.headers.get('retry-after'))).toBeLessThanOrEqual(60);
    expect(mocks.previewImport).toHaveBeenCalledTimes(3);
    expect(mocks.commitImport).toHaveBeenCalledTimes(3);

    await previewPost(request('still not JSON', '192.0.2.25', true));
    const deniedRow = await prisma.rateLimit.findUniqueOrThrow({ where: { key: admittedRow.key } });
    expect(deniedRow).toMatchObject({
      count: IMPORT_REQUEST_LIMIT.limit + 1,
      lastRequest: admittedRow.lastRequest,
    });
  });

  it('recovers after the persisted fixed window expires', async () => {
    for (let attempt = 0; attempt <= IMPORT_REQUEST_LIMIT.limit; attempt += 1) {
      await consumeAuthenticatedRequestLimit(mocks.userId, IMPORT_REQUEST_LIMIT);
    }
    const key = `${KEY_PREFIX}${mocks.userId.slice(4)}`;
    await prisma.rateLimit.update({ where: { key }, data: { lastRequest: 0n } });

    const recovered = await previewPost(request(validPreviewBody, '203.0.113.20'));

    expect(recovered.status).toBe(200);
    await expect(prisma.rateLimit.findUniqueOrThrow({ where: { key } })).resolves.toMatchObject({
      count: 1,
    });
  });

  it('atomically bounds concurrent admissions in PostgreSQL', async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () =>
      consumeAuthenticatedRequestLimit(mocks.userId, IMPORT_REQUEST_LIMIT)));

    expect(results.filter((result) => result.allowed)).toHaveLength(IMPORT_REQUEST_LIMIT.limit);
    expect(results.filter((result) => !result.allowed)).toHaveLength(6);
    await expect(prisma.rateLimit.findUniqueOrThrow({
      where: { key: `${KEY_PREFIX}${mocks.userId.slice(4)}` },
    })).resolves.toMatchObject({ count: IMPORT_REQUEST_LIMIT.limit + 1 });
  });
});
