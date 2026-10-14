import Decimal from 'decimal.js';

import { CURRENCIES, type Currency, type FxStatus } from '@/shared/contracts';
import {
  evaluateFxStatus,
  FX_PROVIDER,
  FxProviderError,
  parseFrankfurterResponseText,
} from '@/server/domain/fx';
import type { FxAnalyticsContext } from '@/server/domain/analytics';
import { getPrisma } from '@/server/db/prisma';

const FRANKFURTER_URL =
  'https://api.frankfurter.dev/v2/rates?base=USD&quotes=INR,EUR,GBP,JPY,CAD,AUD,SGD&providers=ecb';

function unavailableStoredStatus(status: FxStatus): FxStatus {
  return {
    ...status,
    available: false,
    state: 'STALE',
    message: 'Stored FX snapshot failed integrity validation',
  };
}

export async function getFxContext(now = new Date()): Promise<FxAnalyticsContext> {
  const prisma = getPrisma();
  const [snapshot, attempt] = await Promise.all([
    prisma.fxSnapshot.findFirst({
      orderBy: [{ rateDate: 'desc' }, { fetchedAt: 'desc' }, { id: 'desc' }],
    }),
    prisma.fxRefreshAttempt.findFirst({
      orderBy: [{ attemptedAt: 'desc' }, { id: 'desc' }],
    }),
  ]);
  const lastSuccessfulValidation = snapshot
    ? await prisma.fxRefreshAttempt.findFirst({
        where: { succeeded: true, snapshotId: snapshot.id },
        orderBy: [{ attemptedAt: 'desc' }, { id: 'desc' }],
      })
    : null;
  const status = evaluateFxStatus(
    snapshot
      ? {
          id: snapshot.id,
          rateDate: snapshot.rateDate.toISOString().slice(0, 10),
          fetchedAt: snapshot.fetchedAt,
          provider: snapshot.provider,
        }
      : null,
    attempt
      ? { attemptedAt: attempt.attemptedAt, succeeded: attempt.succeeded, snapshotId: attempt.snapshotId }
      : null,
    now,
    lastSuccessfulValidation?.attemptedAt ?? null,
  );
  if (!snapshot) return { status, rates: {} };

  const stored = snapshot.rates;
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return { status: unavailableStoredStatus(status), rates: {} };
  }
  try {
    const rates = Object.fromEntries(
      CURRENCIES.map((currency) => {
        const value = (stored as Record<string, unknown>)[currency];
        if (typeof value !== 'string') throw new Error('invalid rate');
        const decimal = new Decimal(value);
        if (!decimal.isFinite() || decimal.lte(0)) throw new Error('invalid rate');
        return [currency, decimal];
      }),
    ) as Record<Currency, Decimal>;
    if (!rates.USD.eq(1)) throw new Error('invalid USD convention');
    return { status, rates };
  } catch {
    return { status: unavailableStoredStatus(status), rates: {} };
  }
}

async function fetchRates(now: Date): Promise<ReturnType<typeof parseFrankfurterResponseText>> {
  const response = await fetch(FRANKFURTER_URL, {
    headers: { accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (!response.ok) throw new FxProviderError('Provider request failed');
  return parseFrankfurterResponseText(await response.text(), now);
}

export async function refreshFx(now = new Date()): Promise<FxStatus> {
  const prisma = getPrisma();
  try {
    const parsed = await fetchRates(now);
    let snapshotId: string;
    try {
      const snapshot = await prisma.fxSnapshot.create({
        data: {
          rateDate: new Date(`${parsed.rateDate}T00:00:00.000Z`),
          fetchedAt: now,
          provider: parsed.provider,
          checksum: parsed.checksum,
          rates: parsed.rates,
        },
      });
      snapshotId = snapshot.id;
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
      const existing = await prisma.fxSnapshot.findUnique({
        where: { checksum: parsed.checksum },
        select: { id: true },
      });
      if (!existing) throw error;
      snapshotId = existing.id;
    }
    await prisma.fxRefreshAttempt.create({
      data: {
        attemptedAt: now,
        succeeded: true,
        message: 'Complete ECB snapshot stored',
        snapshotId,
      },
    });
  } catch (error) {
    const providerFailure =
      error instanceof FxProviderError ||
      error instanceof TypeError ||
      (error instanceof DOMException && error.name === 'TimeoutError');
    if (!providerFailure) throw error;
    await prisma.fxRefreshAttempt.create({
      data: {
        attemptedAt: now,
        succeeded: false,
        message: 'FX provider refresh failed',
      },
    });
  }
  return (await getFxContext(now)).status;
}

export { FX_PROVIDER };
