import { describe, expect, it } from 'vitest';

import { formatCurrency, formatDate, formatEmploymentType, formatSalary, roundDecimal } from './formatters';

describe('roundDecimal', () => {
  it('rounds decimal strings half up without converting through Number', () => {
    expect(roundDecimal('999999999999.995', 2)).toBe('1000000000000.00');
    expect(roundDecimal('124.994', 2)).toBe('124.99');
  });
});

describe('formatCurrency', () => {
  it('uses the configured currency precision', () => {
    expect(formatCurrency('1234567.5', 'USD')).toBe('USD 1,234,567.50');
    expect(formatCurrency('1234567.8', 'JPY')).toBe('JPY 1,234,568');
    expect(formatCurrency('12345.67', 'BRL')).toBe('BRL 12,345.67');
  });
});

describe('formatSalary', () => {
  it('distinguishes pending compensation from a numerical amount', () => {
    expect(formatSalary(null, 'BRL')).toBe('Salary pending (BRL)');
    expect(formatSalary(null, 'EUR')).toBe('Salary pending (EUR)');
    expect(formatSalary('12345.67', 'BRL')).toBe('BRL 12,345.67');
  });
});

describe('labels', () => {
  it('formats stable date and employment labels', () => {
    expect(formatDate('2026-10-14')).toBe('14 Oct 2026');
    expect(formatEmploymentType('FULL_TIME')).toBe('Full time');
    expect(formatEmploymentType('INTERN')).toBe('Intern');
  });
});
