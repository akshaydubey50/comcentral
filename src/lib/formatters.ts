import type { Currency, EmploymentType } from '@/shared/contracts';

export const CURRENCY_PRECISION: Record<Currency, number> = {
  USD: 2, INR: 2, EUR: 2, GBP: 2, JPY: 0, CAD: 2, AUD: 2, SGD: 2, BRL: 2,
};

export function roundDecimal(value: string, precision: number): string {
  const match = /^(-?)(\d+)(?:\.(\d*))?$/.exec(value.trim());
  if (!match) return value;

  const [, sign, rawInteger, rawFraction = ''] = match;
  const padded = rawFraction.padEnd(precision + 1, '0');
  const kept = padded.slice(0, precision);
  const shouldRound = Number(padded[precision] ?? '0') >= 5;
  const scale = 10n ** BigInt(precision);
  let scaled = BigInt(rawInteger) * scale + BigInt(kept || '0');
  if (shouldRound) scaled += 1n;

  const integer = scaled / scale;
  const fraction = precision > 0 ? (scaled % scale).toString().padStart(precision, '0') : '';
  const rounded = precision > 0 ? integer + '.' + fraction : integer.toString();
  return sign === '-' && scaled !== 0n ? '-' + rounded : rounded;
}

export function formatCurrency(value: string | null, currency: Currency): string {
  if (value === null) return '—';
  const rounded = roundDecimal(value, CURRENCY_PRECISION[currency]);
  const sign = rounded.startsWith('-') ? '-' : '';
  const [integer, fraction] = rounded.replace('-', '').split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sign + currency + ' ' + grouped + (fraction === undefined ? '' : '.' + fraction);
}

/** Missing compensation is a draft state, never a zero amount. */
export function formatSalary(value: string | null, currency: Currency): string {
  return value === null ? 'Salary pending' : formatCurrency(value, currency);
}

export function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(value));
}

export function formatEmploymentType(value: EmploymentType): string {
  return value.toLowerCase().replace('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}
