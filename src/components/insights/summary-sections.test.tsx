import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '../../../tests/chart-resize-observer';

import type { Insights } from '@/shared/contracts';
import { GroupSection, SummarySection } from './summary-sections';

const insights: Insights = {
  headcount: 2, salaryPendingCount: 0, asOf: '2026-10-14', currencyMode: 'NATIVE', groupBy: 'department',
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
  it('explains an all-pending population without an empty chart or exact table', () => {
    render(<GroupSection insights={{ ...insights, salaryPendingCount: 2, groups: [] }} />);
    expect(screen.getByRole('status')).toHaveTextContent('No recorded salaries');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('keeps the exact headcount alternative behind an accessible disclosure', () => {
    render(<GroupSection insights={insights} />);
    expect(screen.queryByRole('table', { name: 'Headcount by department' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show exact department headcount' }));
    expect(screen.getByRole('table', { name: 'Headcount by department' })).toBeInTheDocument();
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
    expect(screen.getByText(/6 matching people across 2 departments/)).toHaveTextContent('Native currency rows are combined only for these headcounts.');

    fireEvent.click(screen.getByRole('button', { name: 'Show exact department headcount' }));
    const headcountTable = screen.getByRole('table', { name: 'Headcount by department' });
    const engineering = within(headcountTable).getByRole('row', { name: 'Engineering 5' });
    const people = within(headcountTable).getByRole('row', { name: 'People 1' });
    expect(within(engineering).getByRole('cell', { name: '5' })).toBeInTheDocument();
    expect(within(people).getByRole('cell', { name: '1' })).toBeInTheDocument();
  });
});

describe('Pay summary charts', () => {
  it('retains exact population statistics separately from the grouped ranges', () => {
    render(<SummarySection insights={{ ...insights, summaries: [insights.groups[0]] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show exact USD summary' }));
    const summary = screen.getByRole('table', { name: 'USD population salary statistics' });
    for (const label of ['Minimum', 'Maximum', 'Average', 'Median', 'P25', 'P75']) {
      expect(within(summary).getByRole('columnheader', { name: label })).toBeInTheDocument();
    }
    expect(within(summary).getByText('USD 60,000.00')).toBeInTheDocument();
    expect(within(summary).getByText('USD 100,000.00')).toBeInTheDocument();
  });
  it('reports all-pending headcount and explains why pay statistics have no records', () => {
    render(<SummarySection insights={{ ...insights, headcount: 3, salaryPendingCount: 3, groups: [] }} />);
    expect(screen.getByText('3 employees have salary pending.')).toBeInTheDocument();
    expect(screen.getByText(/included in matching headcount but excluded from pay statistics/i)).toBeInTheDocument();
    expect(screen.getByText(/no recorded salaries match these filters/i)).toBeInTheDocument();
  });

  it('keeps native annual commitments in separate currency cards with exact totals', () => {
    const nativeInsights: Insights = {
      ...insights,
      headcount: 3,
      summaries: [
        insights.groups[0],
        {
          ...insights.groups[0],
          currency: 'INR',
          count: 1,
          total: '12345678901234567890.12',
          average: '12345678901234567890.12',
          median: '12345678901234567890.12',
        },
      ],
    };

    render(<SummarySection insights={nativeInsights} />);

    expect(screen.getByRole('heading', { name: 'USD annual commitment' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'INR annual commitment' })).toBeInTheDocument();
    expect(screen.getByText('USD 160,000.00')).toBeInTheDocument();
    expect(screen.getAllByText('INR 12,345,678,901,234,567,890.12').length).toBeGreaterThan(0);
    const matching = screen.getByText('Matching employees').closest('.MuiCard-root')!;
    const pending = screen.getByText('Salaries pending').closest('.MuiCard-root')!;
    expect(within(matching as HTMLElement).getByText('3')).toBeInTheDocument();
    expect(within(pending as HTMLElement).getByText('0')).toBeInTheDocument();
  });

  it('labels approximate USD statistics with their rate date', () => {
    const usdInsights: Insights = {
      ...insights,
      currencyMode: 'USD',
      summaries: [insights.groups[0]],
      fx: { ...insights.fx, available: true, state: 'FRESH', rateDate: '2026-10-14' },
    };

    render(<SummarySection insights={usdInsights} />);

    expect(screen.getByRole('heading', { name: 'Approximate USD annual commitment' })).toBeInTheDocument();
    expect(screen.getByText('Rate date: 14 Oct 2026')).toBeInTheDocument();
  });
});
