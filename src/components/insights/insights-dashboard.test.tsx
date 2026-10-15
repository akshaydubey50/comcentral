import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { DirectoryOptions, Insights } from '@/shared/contracts';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  options: vi.fn(),
  insights: vi.fn(),
  refreshFx: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/insights',
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams('q=Ada&country=GB&status=ARCHIVED&currencyMode=NATIVE&groupBy=department'),
}));

vi.mock('@/lib/api-client', () => ({
  api: {
    options: mocks.options,
    insights: mocks.insights,
    refreshFx: mocks.refreshFx,
  },
}));

import { InsightsDashboard } from './insights-dashboard';

const cachedOptions: DirectoryOptions = {
  countries: [{ code: 'GB', name: 'United Kingdom', currency: 'GBP' }],
  departments: ['Engineering'],
  jobRoles: ['Engineer'],
  employmentTypes: ['FULL_TIME'],
  currencies: ['GBP'],
};

const recoveredOptions: DirectoryOptions = {
  ...cachedOptions,
  countries: [...cachedOptions.countries, { code: 'FR', name: 'France', currency: 'EUR' }],
  departments: [...cachedOptions.departments, 'Finance'],
};

const report: Insights = {
  headcount: 0,
  salaryPendingCount: 0,
  asOf: '2026-10-15',
  currencyMode: 'NATIVE',
  groupBy: 'department',
  summaries: [],
  groups: [],
  bands: [],
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
    message: 'No rates are available.',
  },
  reportingAvailable: true,
};

describe('InsightsDashboard filter choices', () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.options.mockReset();
    mocks.insights.mockReset();
    mocks.refreshFx.mockReset();
    mocks.insights.mockResolvedValue(report);
    mocks.refreshFx.mockResolvedValue(report.fx);
  });

  it('retains report filters and drafts while failed cached choices recover on retry', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    client.setQueryData(['directory-options'], cachedOptions);
    mocks.options
      .mockRejectedValueOnce(new Error('Options unavailable'))
      .mockResolvedValueOnce(recoveredOptions);

    render(
      <QueryClientProvider client={client}>
        <InsightsDashboard />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/previously loaded filter choices remain available/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Country')).toHaveTextContent('United Kingdom');
    expect(screen.getByLabelText('Status')).toHaveTextContent('Archived');
    expect(mocks.insights).toHaveBeenCalledWith(expect.objectContaining({
      q: 'Ada', country: 'GB', status: 'ARCHIVED', currencyMode: 'NATIVE', groupBy: 'department',
    }));

    fireEvent.change(screen.getByLabelText('Search employees'), { target: { value: 'Draft search' } });
    fireEvent.click(screen.getByRole('button', { name: /retry filter choices/i }));

    await waitFor(() => expect(mocks.options).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByText(/previously loaded filter choices remain available/i)).not.toBeInTheDocument());
    expect(screen.getByLabelText('Search employees')).toHaveValue('Draft search');
    expect(screen.getByLabelText('Status')).toHaveTextContent('Archived');
    expect(screen.getByLabelText('Country')).toHaveTextContent('United Kingdom');
    fireEvent.mouseDown(screen.getByLabelText('Department'));
    expect(await screen.findByRole('option', { name: 'Finance' })).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.insights).toHaveBeenCalledTimes(1);
  });
});
