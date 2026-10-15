import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../../tests/chart-resize-observer';

import type { Insights, PayGroup } from '@/shared/contracts';
import { PayRangeChart } from './pay-range-chart';

function group(overrides: Partial<PayGroup> & Pick<PayGroup, 'label' | 'currency'>): PayGroup {
  return {
    count: 10,
    total: '800000.00',
    min: '25000.00',
    max: '120000.00',
    average: '80000.00',
    median: '80000.00',
    p25: '50000.00',
    p75: '100000.00',
    ...overrides,
  };
}

const insights: Insights = {
  headcount: 31,
  salaryPendingCount: 0,
  asOf: '2026-10-15',
  currencyMode: 'NATIVE',
  groupBy: 'department',
  summaries: [],
  groups: [
    group({ label: 'Engineering', currency: 'USD', p25: '70000.00', median: '80000.00', p75: '90000.00' }),
    group({ label: 'Product', currency: 'USD' }),
    group({ label: 'Operations', currency: 'INR', count: 11, total: '13200000.00', min: '700000.00', max: '1800000.00', average: '1200000.00', median: '1200000.00', p25: '900000.00', p75: '1500000.00' }),
  ],
  bands: [],
  tenure: [],
  outliers: { data: [], total: 0, cohorts: [], minimumGroupSize: 10 },
  fx: { available: false, state: 'MISSING', provider: 'Test provider', snapshotId: null,
    rateDate: null, fetchedAt: null, lastAttemptAt: null, message: 'No rates' },
  reportingAvailable: true,
};

describe('PayRangeChart', () => {
  it('separates native currencies and scales each range within its own currency chart', () => {
    render(<PayRangeChart insights={insights} />);

    expect(screen.getByRole('heading', { name: 'USD pay ranges' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'INR pay ranges' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /USD pay range comparison by department/ }))
      .toHaveAccessibleName(/Engineering: 10 people; P25 USD 70,000\.00; median USD 80,000\.00; P75 USD 90,000\.00/);

    const usd = screen.getByRole('img', { name: /USD pay range comparison/ });
    const inr = screen.getByRole('img', { name: /INR pay range comparison/ });
    expect(usd.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2);
    expect(usd.querySelectorAll('.recharts-reference-dot')).toHaveLength(2);
    expect(inr.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(1);
    expect(inr).toHaveAccessibleName(/Operations: 11 people; P25 INR 900,000.00/);
    expect(inr).not.toHaveAccessibleName(/Engineering/);
  });

  it('keeps complete exact pay statistics behind an accessible disclosure', () => {
    render(<PayRangeChart insights={insights} />);
    expect(screen.queryByRole('table', { name: 'USD salary statistics by department' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Show exact USD pay data' }));
    const table = screen.getByRole('table', { name: 'USD salary statistics by department' });
    const engineering = within(table).getByRole('row', { name: /Engineering/ });
    expect(within(engineering).getByText('USD 70,000.00')).toBeInTheDocument();
    expect(within(engineering).getAllByText('USD 80,000.00')).toHaveLength(2);
    expect(within(engineering).getByText('USD 90,000.00')).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Minimum' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Maximum' })).toBeInTheDocument();
  });

  it('does not render converted ranges when the FX snapshot is unusable', () => {
    render(<PayRangeChart insights={{ ...insights, currencyMode: 'USD', reportingAvailable: false,
      groups: insights.groups.filter((item) => item.currency === 'USD'),
      fx: { ...insights.fx, state: 'STALE' } }} />);

    expect(screen.getByRole('status')).toHaveTextContent('Approximate USD pay ranges are unavailable');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
