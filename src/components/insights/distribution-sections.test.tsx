import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Insights } from '@/shared/contracts';
import { DistributionSection } from './distribution-sections';

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
