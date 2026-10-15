import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Insights } from '@/shared/contracts';
import { DistributionSection, TenureSection } from './distribution-sections';

const insights: Insights = {
  headcount: 3,
  asOf: '2026-10-14',
  currencyMode: 'NATIVE',
  groupBy: 'country',
  summaries: [],
  groups: [],
  bands: [
    { currency: 'USD', label: 'USD 0–under 50,000', lower: '0.00', upper: '50000.00', count: 2 },
    { currency: 'USD', label: 'USD 50,000+', lower: '50000.00', upper: null, count: 0 },
    { currency: 'INR', label: 'INR 0–under 1,000,000', lower: '0.00', upper: '1000000.00', count: 1 },
  ],
  tenure: [],
  outliers: { data: [], total: 0, cohorts: [], minimumGroupSize: 10 },
  fx: {
    available: false,
    state: 'MISSING',
    provider: 'Test provider',
    snapshotId: null,
    rateDate: null,
    fetchedAt: null,
    lastAttemptAt: null,
    message: 'No rates',
  },
  reportingAvailable: true,
};

describe('Salary distribution charts', () => {
  it('keeps native bands in separate currency charts and exact accessible tables', () => {
    render(<DistributionSection insights={insights} />);

    expect(screen.getByLabelText(/USD salary distribution chart/).getAttribute('aria-label')).toMatch(/USD 50,000\+: 0 people/);
    expect(screen.getByLabelText(/INR salary distribution chart/)).toBeInTheDocument();

    const usdTable = screen.getByLabelText('USD salary bands');
    expect(within(usdTable).getByText('USD 0.00')).toBeInTheDocument();
    expect(within(usdTable).getAllByText('USD 50,000.00')).toHaveLength(2);
    expect(within(usdTable).getByText('No upper limit')).toBeInTheDocument();
    expect(within(usdTable).getByText('0')).toBeInTheDocument();
  });

  it('labels usable approximate USD bands by rate date and hides unavailable output', () => {
    const approximateUsd: Insights = {
      ...insights,
      currencyMode: 'USD',
      bands: insights.bands.filter((band) => band.currency === 'USD'),
      fx: { ...insights.fx, available: true, state: 'FRESH', rateDate: '2026-10-14' },
    };
    const { rerender } = render(<DistributionSection insights={approximateUsd} />);

    expect(screen.getByRole('heading', { name: 'Approximate USD ranges' })).toBeInTheDocument();
    expect(screen.getByText('Rate date: 14 Oct 2026')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Approximate USD salary bands' })).toBeInTheDocument();

    rerender(<DistributionSection insights={{ ...approximateUsd, reportingAvailable: false, fx: { ...approximateUsd.fx, state: 'STALE' } }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Approximate USD distribution is unavailable');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a readable empty state when no bands are returned', () => {
    render(<DistributionSection insights={{ ...insights, bands: [] }} />);

    expect(screen.getByRole('status')).toHaveTextContent('No salary bands are available for this filtered population.');
  });
});

describe('Tenure charts', () => {
  const tenureInsights: Insights = {
    ...insights,
    headcount: 4,
    tenure: [
      {
        bucket: 'Under 1 year', currency: 'USD', count: 2, total: '160000.00',
        min: '60000.00', max: '100000.00', average: '80000.00', median: '80000.00',
        p25: '70000.00', p75: '90000.00',
      },
      {
        bucket: '1–under 3 years', currency: 'USD', count: 1, total: '12345678901234567890.12',
        min: '12345678901234567890.12', max: '12345678901234567890.12',
        average: '12345678901234567890.12', median: '12345678901234567890.12',
        p25: '12345678901234567890.12', p75: '12345678901234567890.12',
      },
      {
        bucket: 'Under 1 year', currency: 'INR', count: 1, total: '900000.00',
        min: '900000.00', max: '900000.00', average: '900000.00', median: '900000.00',
        p25: '900000.00', p75: '900000.00',
      },
    ],
  };

  it('uses backend buckets in separate native-currency headcount and pay charts', () => {
    render(<TenureSection insights={tenureInsights} />);

    expect(screen.getByText(/Completed calendar years at 14 Oct 2026 UTC/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'USD tenure' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'INR tenure' })).toBeInTheDocument();
    expect(screen.getByLabelText(/USD headcount by tenure chart/).getAttribute('aria-label')).toMatch(/1–under 3 years: 1 person/);
    expect(screen.getByLabelText(/USD median annual pay by tenure chart/).getAttribute('aria-label')).toMatch(/USD 12,345,678,901,234,567,890\.12/);

    const table = screen.getByLabelText('Pay by tenure bucket');
    expect(within(table).getAllByText('1–under 3 years').length).toBeGreaterThan(0);
    expect(within(table).getAllByText('USD 12,345,678,901,234,567,890.12')).toHaveLength(2);
  });

  it('labels approximate USD tenure by rate date and hides unavailable output', () => {
    const approximateUsd: Insights = {
      ...tenureInsights,
      currencyMode: 'USD',
      tenure: tenureInsights.tenure.filter((bucket) => bucket.currency === 'USD'),
      fx: { ...tenureInsights.fx, available: true, state: 'FRESH', rateDate: '2026-10-14' },
    };
    const { rerender } = render(<TenureSection insights={approximateUsd} />);

    expect(screen.getByRole('heading', { name: 'Approximate USD tenure' })).toBeInTheDocument();
    expect(screen.getByText('Rate date: 14 Oct 2026')).toBeInTheDocument();

    rerender(<TenureSection insights={{ ...approximateUsd, reportingAvailable: false, fx: { ...approximateUsd.fx, state: 'STALE' } }} />);
    expect(screen.getByRole('status')).toHaveTextContent('Approximate USD tenure reporting is unavailable');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows a readable empty state when no tenure buckets are returned', () => {
    render(<TenureSection insights={{ ...insights, tenure: [] }} />);

    expect(screen.getByRole('status')).toHaveTextContent('No tenure data is available for this filtered population.');
  });
});
