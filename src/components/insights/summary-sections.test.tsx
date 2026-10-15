import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import type { Insights } from '@/shared/contracts';
import { GroupSection } from './summary-sections';

const insights: Insights = {
  headcount: 2, asOf: '2026-10-14', currencyMode: 'NATIVE', groupBy: 'department',
  summaries: [], bands: [], tenure: [], reportingAvailable: true,
  groups: [{
    label: 'Engineering', currency: 'USD', count: 2, total: '160000.00',
    min: '60000.00', max: '100000.00', average: '80000.00', median: '80000.00',
    p25: '70000.00', p75: '90000.00',
  }],
  outliers: { data: [], total: 0, cohorts: [], minimumGroupSize: 10 },
  fx: { available: false, state: 'MISSING', provider: 'Test provider', snapshotId: null,
    rateDate: null, fetchedAt: null, lastAttemptAt: null, message: 'No rates' },
};

describe('Grouped pay statistics', () => {
  it('shows the complete salary range alongside the average and quartiles', () => {
    render(<GroupSection insights={insights} />);
    const table = screen.getByRole('table', { name: 'Salary statistics by department' });
    expect(within(table).getByRole('columnheader', { name: 'Minimum' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Maximum' })).toBeInTheDocument();
    const row = within(table).getByRole('row', { name: /Engineering/ });
    expect(within(row).getByText('USD 60,000.00')).toBeInTheDocument();
    expect(within(row).getByText('USD 100,000.00')).toBeInTheDocument();
    expect(within(row).getByText('USD 70,000.00')).toBeInTheDocument();
    expect(within(row).getByText('USD 90,000.00')).toBeInTheDocument();
  });

  it('shows exact filtered headcounts aggregated across currency rows', () => {
    const groupedInsights: Insights = {
      ...insights,
      headcount: 6,
      groups: [
        insights.groups[0],
        {
          ...insights.groups[0],
          currency: 'GBP',
          count: 3,
        },
        {
          ...insights.groups[0],
          label: 'People',
          count: 1,
        },
      ],
    };

    render(<GroupSection insights={groupedInsights} />);

    expect(screen.getByRole('img', {
      name: 'Headcount by department chart. Engineering: 5 people; People: 1 person.',
    })).toBeInTheDocument();
    expect(screen.getByText('6 matching people across 2 departments. Currency rows are combined in these counts.')).toBeInTheDocument();

    const headcountTable = screen.getByRole('table', { name: 'Headcount by department' });
    const engineering = within(headcountTable).getByRole('row', { name: 'Engineering 5' });
    const people = within(headcountTable).getByRole('row', { name: 'People 1' });
    expect(within(engineering).getByRole('cell', { name: '5' })).toBeInTheDocument();
    expect(within(people).getByRole('cell', { name: '1' })).toBeInTheDocument();
  });
});
