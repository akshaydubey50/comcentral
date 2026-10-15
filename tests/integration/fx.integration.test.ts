import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getPrisma } from '../../src/server/db/prisma';
import type { PrismaClient } from '../../src/server/generated/prisma/client';
import { fxChecksum, parseFrankfurterRates } from '../../src/server/domain/fx';
import { getFxContext, refreshFx } from '../../src/server/services/fx';
import { requireIsolatedTestDatabaseUrl } from './test-database';

const now = new Date('2026-10-14T12:00:00Z');
const rows = [['INR', 90], ['EUR', 0.9], ['GBP', 0.8], ['JPY', 150], ['CAD', 1.4], ['AUD', 1.5], ['SGD', 1.3], ['BRL', 5]]
  .map(([quote, rate]) => ({ date: '2026-10-13', base: 'USD', quote, rate }));
let prisma: PrismaClient | undefined;

function provider(payload: unknown = rows) {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify(payload))));
}

describe('persisted FX integrity and refresh state', () => {
  beforeAll(() => {
    const isolated = requireIsolatedTestDatabaseUrl();
    vi.stubEnv('DATABASE_URL', isolated);
    prisma = getPrisma();
  });

  beforeEach(async () => {
    // FX snapshots cannot be deleted by application code. Reset only these fixture
    // tables after the isolated-target guard; no employee or salary tables are touched.
    await prisma!.$executeRawUnsafe('TRUNCATE TABLE "fx_refresh_attempt", "fx_snapshot"');
  });

  afterEach(() => vi.unstubAllGlobals());
  afterAll(async () => {
    await prisma?.$disconnect();
    vi.unstubAllEnvs();
  });

  it('rejects complete positive rates when the stored checksum does not match the content', async () => {
    const parsed = parseFrankfurterRates(rows, now);
    await prisma!.fxSnapshot.create({ data: {
      ...parsed, rateDate: new Date(`${parsed.rateDate}T00:00:00Z`), fetchedAt: now,
      rates: { ...parsed.rates, EUR: '2' },
    } });
    const context = await getFxContext(now);
    expect(context.status).toMatchObject({ available: false, state: 'STALE', message: 'Stored FX snapshot failed integrity validation' });
    expect(context.rates).toEqual({});
  });

  it('deduplicates repeat provider snapshots while persisting fresh validation attempts', async () => {
    provider();
    expect(await refreshFx(now)).toMatchObject({ available: true, state: 'FRESH' });
    const first = await prisma!.fxSnapshot.findFirstOrThrow();
    const later = new Date('2026-10-16T12:00:00Z');
    expect(await refreshFx(later)).toMatchObject({ snapshotId: first.id, available: true, state: 'FRESH' });
    expect(await prisma!.fxSnapshot.count()).toBe(1);
    expect(await prisma!.fxRefreshAttempt.count({ where: { succeeded: true, snapshotId: first.id } })).toBe(2);
    const unchanged = await prisma!.fxSnapshot.findUniqueOrThrow({ where: { id: first.id } });
    expect(unchanged.fetchedAt).toEqual(now);
    expect((await getFxContext(later)).rates.EUR?.toString()).toBe('1.1111111111111111111');
    expect((await getFxContext(later)).rates.BRL?.toString()).toBe('0.2');
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain('BRL');
  });

  it('preserves a verified legacy snapshot but requires refresh for BRL coverage', async () => {
    const parsed = parseFrankfurterRates(rows, now);
    const legacyRates = Object.fromEntries(Object.entries(parsed.rates).filter(([currency]) => currency !== 'BRL'));
    const legacy = await prisma!.fxSnapshot.create({ data: {
      provider: parsed.provider, rateDate: new Date(`${parsed.rateDate}T00:00:00Z`), fetchedAt: now,
      rates: legacyRates, checksum: fxChecksum({ ...parsed, rates: legacyRates }),
    } });
    const unavailable = await getFxContext(now);
    expect(unavailable.status).toMatchObject({ available: false, state: 'STALE' });
    expect(unavailable.status.message).toMatch(/BRL.*Refresh/i);
    expect(unavailable.rates).toEqual({});
    provider();
    expect(await refreshFx(new Date('2026-10-14T13:00:00Z'))).toMatchObject({ available: true, state: 'FRESH' });
    const unchanged = await prisma!.fxSnapshot.findUniqueOrThrow({ where: { id: legacy.id } });
    expect(unchanged).toEqual(legacy);
    expect(await prisma!.fxSnapshot.count()).toBe(2);
  });

  it('records failed provider refreshes and exposes cached or missing status without silent fallback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network failure')));
    expect(await refreshFx(now)).toMatchObject({ available: false, state: 'MISSING' });
    provider();
    await refreshFx(now);
    provider([{ ...rows[0], rate: -1 }, ...rows.slice(1)]);
    expect(await refreshFx(new Date('2026-10-14T13:00:00Z'))).toMatchObject({ available: true, state: 'CACHED' });
    expect(await prisma!.fxRefreshAttempt.count({ where: { succeeded: false } })).toBe(2);
    expect(await prisma!.fxSnapshot.count()).toBe(1);
  });

  it('makes old reference dates unavailable and keeps stored snapshots immutable', async () => {
    provider();
    await refreshFx(now);
    const snapshot = await prisma!.fxSnapshot.findFirstOrThrow();
    expect((await getFxContext(new Date('2026-10-22T12:00:00Z'))).status)
      .toMatchObject({ available: false, state: 'STALE' });
    await expect(prisma!.fxSnapshot.update({ where: { id: snapshot.id }, data: { provider: 'Tampered' } }))
      .rejects.toThrow(/immutable/i);
  });
});
