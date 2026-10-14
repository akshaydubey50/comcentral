import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  employee: vi.fn(),
  options: vi.fn(),
  salaryHistory: vi.fn(),
  setArchived: vi.fn(),
}));

vi.mock('@/lib/api-client', () => {
  class ApiClientError extends Error {
    readonly code: string;

    constructor(
      public readonly status: number,
      body?: { error?: { code?: string; message?: string } },
    ) {
      super(body?.error?.message);
      this.code = body?.error?.code ?? 'REQUEST_FAILED';
    }
  }
  return {
    ApiClientError,
    api: {
      employee: mocks.employee,
      options: mocks.options,
      salaryHistory: mocks.salaryHistory,
      setArchived: mocks.setArchived,
    },
  };
});

import { ApiClientError } from '@/lib/api-client';
import { EmployeeDetails } from './employee-details';

const employee = {
  id: 'emp-1',
  employeeCode: 'ACME-001',
  name: 'Ada Lovelace',
  email: 'ada@acme.test',
  country: 'GB',
  department: 'Engineering',
  jobRole: 'Principal Engineer',
  employmentType: 'FULL_TIME' as const,
  joiningDate: '2020-01-02',
  salary: '125000.00',
  currency: 'GBP' as const,
  status: 'ACTIVE' as const,
  version: 7,
  createdAt: '2020-01-02T00:00:00.000Z',
  updatedAt: '2026-10-14T00:00:00.000Z',
};
const archivedEmployee = {
  ...employee,
  status: 'ARCHIVED' as const,
  version: 8,
  updatedAt: '2026-10-14T01:00:00.000Z',
};
const options = {
  countries: [{ code: 'GB', name: 'United Kingdom', currency: 'GBP' as const }],
  departments: ['Engineering'],
  jobRoles: ['Principal Engineer'],
  employmentTypes: ['FULL_TIME' as const],
  currencies: ['GBP' as const],
};

function renderDetails(client = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})) {
  render(
    <QueryClientProvider client={client}>
      <EmployeeDetails id="emp-1" />
    </QueryClientProvider>,
  );
  return client;
}

describe('EmployeeDetails', () => {
  beforeEach(() => {
    mocks.employee.mockReset();
    mocks.options.mockReset();
    mocks.salaryHistory.mockReset();
    mocks.setArchived.mockReset();
    mocks.employee.mockResolvedValue(employee);
    mocks.options.mockResolvedValue(options);
    mocks.salaryHistory.mockResolvedValue([]);
  });

  it('blocks editing until failed directory options are retried successfully', async () => {
    mocks.options
      .mockRejectedValueOnce(new Error('Options unavailable'))
      .mockResolvedValueOnce(options);
    renderDetails();

    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit details/i })).toBeDisabled();
    expect(screen.getByText(/editing is unavailable until directory options load/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry options/i }));

    await waitFor(() => expect(mocks.options).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: /edit details/i })).toBeEnabled());
  });

  it('keeps editing blocked when directory options contain no countries', async () => {
    mocks.options.mockResolvedValue({ ...options, countries: [] });
    renderDetails();

    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit details/i })).toBeDisabled();
  });

  it('keeps the archive version confirmed by HR when the record refetches in the background', async () => {
    mocks.setArchived.mockRejectedValue(new ApiClientError(409, {
      error: { code: 'VERSION_CONFLICT', message: 'Employee changed' },
    }));
    const client = renderDetails();
    await screen.findByRole('heading', { name: 'Ada Lovelace' });

    fireEvent.click(screen.getByRole('button', { name: 'Archive employee' }));
    client.setQueryData(['employee', 'emp-1'], archivedEmployee);
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));

    await waitFor(() => expect(mocks.setArchived).toHaveBeenCalledWith('emp-1', 7, true));
  });

  it('reloads after an archive conflict without retrying and requires a new confirmation', async () => {
    mocks.employee
      .mockResolvedValueOnce(employee)
      .mockResolvedValueOnce(archivedEmployee);
    mocks.setArchived.mockRejectedValueOnce(new ApiClientError(409, {
      error: { code: 'VERSION_CONFLICT', message: 'Employee changed' },
    }));
    mocks.salaryHistory
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{
        id: 'history-1',
        employeeId: employee.id,
        previousSalary: '125000.00',
        previousCurrency: 'GBP',
        salary: '140000.00',
        currency: 'GBP',
        reason: 'Concurrent salary correction',
        actor: { id: 'hr-1', name: 'HR Manager', email: 'hr@acme.test' },
        createdAt: '2026-10-14T01:00:00.000Z',
      }]);
    renderDetails();
    await screen.findByRole('heading', { name: 'Ada Lovelace' });
    await screen.findByText('No salary changes yet');

    fireEvent.click(screen.getByRole('button', { name: 'Archive employee' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    fireEvent.click(await screen.findByRole('button', { name: /reload latest/i }));

    await waitFor(() => expect(mocks.employee).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Concurrent salary correction')).toBeInTheDocument();
    expect(mocks.setArchived).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'Restore employee' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Restore employee' }));
    expect(await screen.findByText('Restore employee?')).toBeInTheDocument();
    expect(mocks.setArchived).toHaveBeenCalledTimes(1);
  });

  it('retains the employee and confirmation when conflict reload fails', async () => {
    mocks.employee
      .mockResolvedValueOnce(employee)
      .mockRejectedValueOnce(new Error('Network unavailable'));
    mocks.setArchived.mockRejectedValueOnce(new ApiClientError(409, {
      error: { code: 'VERSION_CONFLICT', message: 'Employee changed' },
    }));
    renderDetails();
    await screen.findByRole('heading', { name: 'Ada Lovelace' });

    fireEvent.click(screen.getByRole('button', { name: 'Archive employee' }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    fireEvent.click(await screen.findByRole('button', { name: /reload latest/i }));

    expect(await screen.findByText(/latest employee record could not be loaded/i)).toBeInTheDocument();
    // MUI hides the background from assistive technology while this confirmation is open.
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Archive employee?')).toBeInTheDocument();
    expect(mocks.setArchived).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
  });
});
