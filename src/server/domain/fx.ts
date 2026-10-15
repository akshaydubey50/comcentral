import { createHash } from 'node:crypto';

import Decimal from 'decimal.js';

import { CURRENCIES, type Currency, type FxStatus } from '@/shared/contracts';

export const FX_PROVIDER = 'Frankfurter v2 / ECB';

export class FxProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FxProviderError';
  }
}

export interface ParsedFxRates {
  provider: string;
  rateDate: string;
  rates: Record<Currency, string>;
  checksum: string;
}

type ProviderRow = { date: string; base: string; quote: string; rate: unknown };
type ProviderCurrency = Exclude<Currency, 'USD'>;

/** Stable content identity used both when saving and reading immutable snapshots. */
export function fxChecksum(snapshot: Pick<ParsedFxRates, 'provider' | 'rateDate' | 'rates'>): string {
  const canonical = JSON.stringify({
    provider: snapshot.provider,
    rateDate: snapshot.rateDate,
    rates: CURRENCIES.map((currency) => [currency, snapshot.rates[currency]]),
  });
  return createHash('sha256').update(canonical).digest('hex');
}

function isProviderCurrency(value: string): value is ProviderCurrency {
  return value !== 'USD' && CURRENCIES.some((currency) => currency === value);
}

export function parseFrankfurterRates(payload: unknown, now = new Date()): ParsedFxRates {
  if (!Array.isArray(payload)) throw new FxProviderError('Provider response must be an array');
  const required: ProviderCurrency[] = CURRENCIES.filter(isProviderCurrency);
  const quotes = new Map<Currency, Decimal>();
  let rateDate: string | null = null;

  for (const item of payload) {
    if (!item || typeof item !== 'object') {
      throw new FxProviderError('Provider response contains an invalid row');
    }
    const row = item as ProviderRow;
    if (row.base !== 'USD' || !isProviderCurrency(row.quote)) {
      throw new FxProviderError('Provider response contains an unexpected currency');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      throw new FxProviderError('Provider rate date is invalid');
    }
    if (rateDate !== null && row.date !== rateDate) {
      throw new FxProviderError('Provider rate dates are inconsistent');
    }
    rateDate = row.date;
    let numericRate: Decimal | null = null;
    try {
      numericRate =
        typeof row.rate === 'number' || typeof row.rate === 'string'
          ? new Decimal(row.rate)
          : null;
    } catch {
      throw new FxProviderError('Provider rate must be positive and finite');
    }
    if (!numericRate || !numericRate.isFinite() || numericRate.lte(0)) {
      throw new FxProviderError('Provider rate must be positive and finite');
    }
    const quote = row.quote;
    if (quotes.has(quote)) throw new FxProviderError('Provider currency is duplicated');
    quotes.set(quote, numericRate);
  }

  if (!rateDate || required.some((currency) => !quotes.has(currency))) {
    throw new FxProviderError('Provider response does not have complete supported currency coverage');
  }
  const parsedDate = new Date(`${rateDate}T00:00:00.000Z`);
  if (
    Number.isNaN(parsedDate.valueOf()) ||
    parsedDate.toISOString().slice(0, 10) !== rateDate ||
    rateDate > now.toISOString().slice(0, 10)
  ) {
    throw new FxProviderError('Provider rate date is invalid or in the future');
  }

  const rates = Object.fromEntries(
    CURRENCIES.map((currency) => [
      currency,
      currency === 'USD'
        ? '1'
        : new Decimal(1).div(quotes.get(currency)!).toSignificantDigits(20).toString(),
    ]),
  ) as Record<Currency, string>;
  return {
    provider: FX_PROVIDER,
    rateDate,
    rates,
    checksum: fxChecksum({ provider: FX_PROVIDER, rateDate, rates }),
  };
}


export function parseFrankfurterResponseText(text: string, now = new Date()): ParsedFxRates {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new FxProviderError('Provider response was not valid JSON');
  }
  return parseFrankfurterRates(payload, now);
}

interface StatusSnapshot {
  id: string;
  rateDate: string;
  fetchedAt: Date;
  provider: string;
}

interface StatusAttempt {
  attemptedAt: Date;
  succeeded: boolean;
  snapshotId?: string | null;
}

export function evaluateFxStatus(
  snapshot: StatusSnapshot | null,
  lastAttempt: StatusAttempt | null,
  now = new Date(),
  lastSuccessfulValidationAt: Date | null = null,
): FxStatus {
  if (!snapshot) {
    return {
      available: false,
      state: 'MISSING',
      provider: FX_PROVIDER,
      snapshotId: null,
      rateDate: null,
      fetchedAt: null,
      lastAttemptAt: lastAttempt?.attemptedAt.toISOString() ?? null,
      message: 'No complete FX snapshot is available',
    };
  }

  const today = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const reference = new Date(`${snapshot.rateDate}T00:00:00.000Z`);
  const calendarAgeDays = Math.floor((today.valueOf() - reference.valueOf()) / 86_400_000);
  const validatedAt = lastSuccessfulValidationAt ?? snapshot.fetchedAt;
  const fetchedAgeHours = (now.valueOf() - validatedAt.valueOf()) / 3_600_000;
  const base = {
    provider: snapshot.provider,
    snapshotId: snapshot.id,
    rateDate: snapshot.rateDate,
    fetchedAt: snapshot.fetchedAt.toISOString(),
    lastAttemptAt: lastAttempt?.attemptedAt.toISOString() ?? null,
  };

  if (calendarAgeDays > 7) {
    return {
      ...base,
      available: false,
      state: 'STALE',
      message: 'Latest FX reference date is older than seven calendar days',
    };
  }
  const failedAfterSnapshot =
    lastAttempt !== null &&
    !lastAttempt.succeeded &&
    lastAttempt.attemptedAt.valueOf() >= validatedAt.valueOf();
  if (failedAfterSnapshot || fetchedAgeHours > 36) {
    return {
      ...base,
      available: true,
      state: 'CACHED',
      message: failedAfterSnapshot
        ? 'Latest refresh failed; using the last complete snapshot'
        : 'FX snapshot was fetched more than 36 hours ago',
    };
  }
  return {
    ...base,
    available: true,
    state: 'FRESH',
    message: 'FX snapshot is current',
  };
}
