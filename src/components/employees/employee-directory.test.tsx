import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  search: '',
  push: vi.fn(),
  employees: vi.fn(),
  options: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/employees',
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock('@/lib/api-client', () => ({
  api: {
    employees: mocks.employees,
    options: mocks.options,
    exportEmployees: vi.fn(),
  },
  downloadBlob: vi.fn(),
}));

vi.mock('./employee-table', () => ({ EmployeeTable: () => <div>Employee rows</div> }));

import { EmployeeDirectory } from './employee-directory';

const options = {
  countries: [{ code: 'GB', name: 'United Kingdom', currency: 'GBP' as const }],
  departments: ['Engineering'],
  jobRoles: ['Analyst'],
  employmentTypes: ['FULL_TIME' as const],
  currencies: ['GBP' as const],
};

function renderDirectory() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(<QueryClientProvider client={client}><EmployeeDirectory /></QueryClientProvider>);
}

describe('EmployeeDirectory', () => {
  beforeEach(() => {
    mocks.search = '';
    mocks.push.mockReset();
    mocks.employees.mockReset();
    mocks.options.mockReset();
    mocks.employees.mockResolvedValue({
      data: [{ id: 'employee-1' }],
      pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    mocks.options.mockResolvedValue(options);
  });

  it('sends normalized URL state to the employee API', async () => {
    mocks.search = 'q=Ada&page=bad&pageSize=bad&status=UNKNOWN&employmentType=INTERN&sortBy=other&sortOrder=desc';

    renderDirectory();

    await waitFor(() => expect(mocks.employees).toHaveBeenCalledWith({
      q: 'Ada',
      country: undefined,
      department: undefined,
      jobRole: undefined,
      employmentType: undefined,
      status: 'ACTIVE',
      page: 1,
      pageSize: 25,
      sortBy: 'name',
      sortOrder: 'desc',
    }));
  });

  it('keeps employee creation unavailable until required country options load', () => {
    mocks.options.mockReturnValue(new Promise(() => undefined));

    renderDirectory();

    expect(screen.getByRole('button', { name: /add employee/i })).toBeDisabled();
  });

  it('offers an options retry and enables employee creation after recovery', async () => {
    mocks.options
      .mockRejectedValueOnce(new Error('Options unavailable'))
      .mockResolvedValueOnce(options);

    renderDirectory();

    fireEvent.click(await screen.findByRole('button', { name: /retry filter choices/i }));

    await waitFor(() => expect(mocks.options).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: /add employee/i })).toBeEnabled());
  });
});
