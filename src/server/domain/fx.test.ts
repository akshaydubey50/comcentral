import { describe, expect, it } from 'vitest';

import {
  evaluateFxStatus,
  fxChecksum,
  FxProviderError,
  parseFrankfurterRates,
  parseFrankfurterResponseText,
} from './fx';

const rows = [
  ['INR', 90],
  ['EUR', 0.9],
  ['GBP', 0.8],
  ['JPY', 150],
  ['CAD', 1.4],
  ['AUD', 1.5],
  ['SGD', 1.3],
].map(([quote, rate]) => ({ date: '2026-10-13', base: 'USD', quote, rate }));

describe('Frankfurter FX validation', () => {
  it('hashes every identifying field with stable currency order', () => {
    const parsed = parseFrankfurterRates(rows, new Date('2026-10-14T12:00:00Z'));
    const reversed = Object.fromEntries(Object.entries(parsed.rates).reverse()) as typeof parsed.rates;
    expect(fxChecksum({ ...parsed, rates: reversed })).toBe(parsed.checksum);
    expect(fxChecksum({ ...parsed, provider: 'Changed provider' })).not.toBe(parsed.checksum);
    expect(fxChecksum({ ...parsed, rateDate: '2026-10-12' })).not.toBe(parsed.checksum);
    expect(fxChecksum({ ...parsed, rates: { ...parsed.rates, EUR: '2' } })).not.toBe(parsed.checksum);
  });
  it('builds complete USD-per-unit rates and includes USD one', () => {
    const parsed = parseFrankfurterRates(rows, new Date('2026-10-14T12:00:00Z'));
    expect(parsed.rateDate).toBe('2026-10-13');
    expect(parsed.rates.USD).toBe('1');
    expect(parsed.rates.EUR).toBe('1.1111111111111111111');
  });



  it('normalizes malformed JSON and invalid decimal rates as provider failures', () => {
    expect(() => parseFrankfurterResponseText('{bad json')).toThrow(FxProviderError);
    expect(() =>
      parseFrankfurterRates(
        [{ ...rows[0], rate: 'not-a-number' }, ...rows.slice(1)],
        new Date('2026-10-14T12:00:00Z'),
      ),
    ).toThrow(FxProviderError);
  });

  it('rejects partial provider coverage', () => {
    expect(() =>
      parseFrankfurterRates(rows.slice(0, -1), new Date('2026-10-14T12:00:00Z')),
    ).toThrow(/coverage/i);
  });
});

describe('FX status', () => {
  it('marks an old reference date stale and unavailable', () => {
    const status = evaluateFxStatus(
      {
        id: 'snapshot-1',
        rateDate: '2026-10-01',
        fetchedAt: new Date('2026-10-01T21:00:00Z'),
        provider: 'Frankfurter v2 / ECB',
      },
      null,
      new Date('2026-10-14T12:00:00Z'),
    );
    expect(status).toMatchObject({ state: 'STALE', available: false });
  });



  it('uses a successful repeat validation to keep an immutable weekend snapshot fresh', () => {
    const status = evaluateFxStatus(
      {
        id: 'snapshot-1',
        rateDate: '2026-10-10',
        fetchedAt: new Date('2026-10-10T21:00:00Z'),
        provider: 'Frankfurter v2 / ECB',
      },
      {
        attemptedAt: new Date('2026-10-12T21:00:00Z'),
        succeeded: true,
        snapshotId: 'snapshot-1',
      },
      new Date('2026-10-13T12:00:00Z'),
      new Date('2026-10-12T21:00:00Z'),
    );
    expect(status).toMatchObject({ state: 'FRESH', available: true });
  });

  it('marks a usable snapshot cached after a failed refresh', () => {
    const status = evaluateFxStatus(
      {
        id: 'snapshot-1',
        rateDate: '2026-10-13',
        fetchedAt: new Date('2026-10-13T21:00:00Z'),
        provider: 'Frankfurter v2 / ECB',
      },
      { attemptedAt: new Date('2026-10-14T09:00:00Z'), succeeded: false },
      new Date('2026-10-14T12:00:00Z'),
    );
    expect(status).toMatchObject({ state: 'CACHED', available: true });
  });
});
