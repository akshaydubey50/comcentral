import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import type { Insights } from '@/shared/contracts';
import { DataReadiness } from './data-readiness';

const report: Insights = {
  headcount: 100, salaryPendingCount: 20, asOf: '2026-10-15', currencyMode: 'NATIVE', groupBy: 'country',
  summaries: [], groups: [], bands: [], tenure: [],
  outliers: { data: [], total: 0, minimumGroupSize: 10, cohorts: [
    { country: 'BR', currency: 'BRL', jobRole: 'Engineer', employmentType: 'FULL_TIME', count: 50, state: 'EVALUATED' },
    { country: 'BR', currency: 'BRL', jobRole: 'Analyst', employmentType: 'FULL_TIME', count: 5, state: 'INSUFFICIENT_DATA' },
    { country: 'BR', currency: 'BRL', jobRole: 'Manager', employmentType: 'FULL_TIME', count: 25, state: 'ZERO_IQR' },
  ] },
  fx: { available: false, state: 'MISSING', provider: 'Test provider', snapshotId: null, rateDate: null,
    fetchedAt: null, lastAttemptAt: null, message: 'No rates are available.' },
  reportingAvailable: true,
};

describe('DataReadiness', () => {
  it('explains full-population coverage and links to exact matching employee sets', () => {
    render(<DataReadiness insights={report} filters={{ q: 'Ada & Co', country: 'BR', department: 'R&D', jobRole: 'Engineer', employmentType: 'INTERN', status: 'ARCHIVED' }} />);
    const section = screen.getByRole('region', { name: 'Data readiness' });
    expect(within(section).getByText('80 of 100 employees have a recorded salary (80%).')).toBeInTheDocument();
    expect(within(section).getByText('1 of 3 cohorts evaluated')).toBeInTheDocument();
    expect(within(section).getByText('50 of 80 employees with recorded salaries were evaluated.')).toBeInTheDocument();
    for (const [name, status] of [['View matching employees', null], ['View recorded salaries', 'RECORDED'], ['Review pending salaries', 'PENDING']] as const) {
      const url = new URL(within(section).getByRole('link', { name }).getAttribute('href')!, 'http://localhost');
      expect(url.pathname).toBe('/employees');
      expect(Object.fromEntries(url.searchParams)).toMatchObject({ q: 'Ada & Co', country: 'BR', department: 'R&D', jobRole: 'Engineer', employmentType: 'INTERN', status: 'ARCHIVED', page: '1' });
      expect(url.searchParams.get('salaryStatus')).toBe(status);
      expect(url.searchParams.has('currencyMode')).toBe(false);
    }
    expect(within(section).getByText('1 below minimum size · 1 with zero spread')).toBeInTheDocument();
    expect(within(section).getByText('No rates')).toBeInTheDocument();
  });

  it('keeps salary coverage available when USD conversion is unavailable', () => {
    render(<DataReadiness insights={{ ...report, currencyMode: 'USD', reportingAvailable: false }} filters={{ status: 'ALL' }} />);
    expect(screen.getByText('80 of 100 employees have a recorded salary (80%).')).toBeInTheDocument();
    expect(screen.getByText('USD reporting unavailable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review pending salaries' })).toHaveAttribute('href', expect.stringContaining('salaryStatus=PENDING'));
  });

  it('does not invent a percentage or claim outliers were checked for an empty population', () => {
    render(<DataReadiness insights={{ ...report, headcount: 0, salaryPendingCount: 0, outliers: { ...report.outliers, cohorts: [] } }} filters={{}} />);
    expect(screen.getByText('No employees match the applied filters.')).toBeInTheDocument();
    expect(screen.getByText('No recorded salaries to evaluate.')).toBeInTheDocument();
    expect(screen.queryByText(/100%|NaN|Infinity/)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Review pending salaries' })).not.toBeInTheDocument();
  });

  it.each(['FRESH', 'CACHED', 'STALE'] as const)('shows the actual %s FX state and dated provenance', (state) => {
    render(<DataReadiness insights={{ ...report, fx: { ...report.fx, state, available: state !== 'STALE', rateDate: '2026-10-14' } }} filters={{}} />);
    expect(screen.getByText(state === 'FRESH' ? 'Fresh rates' : state === 'CACHED' ? 'Cached rates' : 'Rates unavailable')).toBeInTheDocument();
    expect(screen.getByText(/Test provider · reference date/)).toBeInTheDocument();
  });

  it.each([
    [10_000, 1, '99.99%'], [200_000, 1, '>99.99%'], [200_000, 199_999, '<0.01%'],
  ])('keeps partial coverage visibly partial for %i employees and %i pending salaries', (headcount, salaryPendingCount, percentage) => {
    render(<DataReadiness insights={{ ...report, headcount, salaryPendingCount }} filters={{ salaryStatus: 'RECORDED' }} />);
    expect(screen.getByText(new RegExp(`recorded salary \\(${percentage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View matching employees' })).toHaveAttribute('href', expect.stringContaining('salaryStatus=RECORDED'));
  });
});
