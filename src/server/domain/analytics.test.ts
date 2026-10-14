import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';

import { buildOutlierAnalysis, completedYears, statistics } from './analytics';

describe('statistics', () => {
  it('uses R type 7 interpolation and exact decimal arithmetic', () => {
    const result = statistics(['10', '20', '30', '40'].map((value) => new Decimal(value)), 2);

    expect(result).toEqual({
      count: 4,
      total: '100.00',
      min: '10.00',
      max: '40.00',
      average: '25.00',
      median: '25.00',
      p25: '17.50',
      p75: '32.50',
    });
  });

  it('returns the documented empty statistics', () => {
    expect(statistics([], 2)).toEqual({
      count: 0,
      total: '0.00',
      min: null,
      max: null,
      average: null,
      median: null,
      p25: null,
      p75: null,
    });
  });
});

describe('completedYears', () => {
  it('treats a February 29 anniversary as February 28 in non-leap years', () => {
    expect(completedYears('2020-02-29', '2023-02-27')).toBe(2);
    expect(completedYears('2020-02-29', '2023-02-28')).toBe(3);
  });
});


describe('outlier review', () => {
  it('flags strict IQR outliers only when the native cohort has at least ten people', () => {
    const employees = [...Array.from({ length: 10 }, (_, index) => ({
      id: `employee-${index}`,
      employeeCode: `E-${index}`,
      name: `Employee ${index}`,
      country: 'US',
      currency: 'USD' as const,
      jobRole: 'Engineer',
      employmentType: 'FULL_TIME' as const,
      salary: new Decimal(String(10 + index)),
    })), {
      id: 'employee-outlier',
      employeeCode: 'E-OUT',
      name: 'Outlier',
      country: 'US',
      currency: 'USD' as const,
      jobRole: 'Engineer',
      employmentType: 'FULL_TIME' as const,
      salary: new Decimal('100'),
    }];

    const result = buildOutlierAnalysis(employees);
    expect(result.total).toBe(1);
    expect(result.data[0]).toMatchObject({ employeeCode: 'E-OUT', direction: 'HIGH' });
    expect(result.cohorts[0]?.state).toBe('EVALUATED');
  });
});
