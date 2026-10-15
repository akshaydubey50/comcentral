import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Insights, OutlierCohort } from '@/shared/contracts';
import { OutlierSection } from './outlier-section';

const insights: Insights = {
  headcount: 3, salaryPendingCount: 0, asOf: '2026-10-15', currencyMode: 'NATIVE', groupBy: 'country',
  summaries: [], groups: [], bands: [], tenure: [],
  outliers: { data: [], total: 0, cohorts: [], minimumGroupSize: 10 },
  fx: { available: false, state: 'MISSING', provider: 'Test provider', snapshotId: null,
    rateDate: null, fetchedAt: null, lastAttemptAt: null, message: 'No rates' },
  reportingAvailable: true,
};

const cohort: OutlierCohort = {
  country: 'GB', currency: 'GBP', jobRole: 'Engineer', employmentType: 'FULL_TIME',
  count: 3, state: 'INSUFFICIENT_DATA',
};

describe('OutlierSection review states', () => {
  it('does not claim an outlier result when all matching salaries are pending', () => {
    render(<OutlierSection insights={{ ...insights, salaryPendingCount: 3 }} />);
    expect(screen.getByRole('status')).toHaveTextContent('No recorded salaries for outlier review');
    expect(screen.getByRole('status')).toHaveTextContent('All matching employees have salary pending');
    expect(screen.queryByText('No salaries need outlier review')).not.toBeInTheDocument();
  });

  it.each(['INSUFFICIENT_DATA', 'ZERO_IQR'] as const)('withholds a conclusion for %s cohorts', (state) => {
    render(<OutlierSection insights={{ ...insights, outliers: { ...insights.outliers, cohorts: [{ ...cohort, state }] } }} />);
    expect(screen.getByRole('status')).toHaveTextContent('No cohorts could be evaluated');
    expect(screen.getByRole('status')).toHaveTextContent('No outlier conclusion was made');
  });

  it('distinguishes evaluated cohorts with no flags from unevaluated cohorts', () => {
    render(<OutlierSection insights={{ ...insights, outliers: { ...insights.outliers, cohorts: [{ ...cohort, count: 10, state: 'EVALUATED' }] } }} />);
    expect(screen.getByRole('status')).toHaveTextContent('No salaries need outlier review');
    expect(screen.getByRole('status')).toHaveTextContent('evaluated cohorts');
  });
});
