import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';

import { buildInsights, buildOutlierAnalysis, completedYears, statistics } from './analytics';

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
  it('excludes pending pay from all salary calculations and the minimum cohort size', () => {
    const employees = Array.from({ length: 9 }, (_, index) => ({
      id: String(index), employeeCode: 'PAID-' + index, name: 'Paid Employee', country: 'BR',
      currency: 'BRL' as const, jobRole: 'Analyst', department: 'Engineering',
      employmentType: 'INTERN' as const, joiningDate: '2020-01-01', salary: new Decimal('100.01'),
    }));
    const pending = { ...employees[0]!, id: 'draft', employeeCode: 'DRAFT-1', salary: null };
    const fx = { status: {
      available: true, state: 'FRESH' as const, provider: 'Test', snapshotId: 'test', rateDate: '2026-10-15',
      fetchedAt: '2026-10-15T00:00:00Z', lastAttemptAt: null, message: 'Test rates',
    }, rates: { BRL: new Decimal('0.2') } };
    const result = buildInsights([...employees, pending], 'NATIVE', 'country', '2026-10-15', fx);
    expect(result).toMatchObject({ headcount: 10, salaryPendingCount: 1 });
    expect(result.summaries).toEqual([expect.objectContaining({ currency: 'BRL', count: 9, total: '900.09', average: '100.01', median: '100.01' })]);
    expect(result.groups[0]?.count).toBe(9);
    expect(result.bands.reduce((total, band) => total + band.count, 0)).toBe(9);
    expect(result.tenure[0]?.count).toBe(9);
    expect(result.outliers.cohorts[0]).toMatchObject({ count: 9, state: 'INSUFFICIENT_DATA' });
    const usd = buildInsights([...employees, pending], 'USD', 'country', '2026-10-15', fx);
    expect(usd.summaries[0]).toMatchObject({ currency: 'USD', count: 9, total: '180.02' });
    const onlyPending = buildInsights([pending], 'NATIVE', 'country', '2026-10-15', fx);
    expect(onlyPending).toMatchObject({ headcount: 1, salaryPendingCount: 1, summaries: [], groups: [], bands: [], tenure: [], outliers: { data: [], total: 0, cohorts: [] } });
  });

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
