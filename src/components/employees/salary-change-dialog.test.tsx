import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({ changeSalary: vi.fn() }));

vi.mock('@/lib/api-client', () => {
  class ApiClientError extends Error {
    constructor(public status: number, body?: { error?: { message?: string } }) {
      super(body?.error?.message);
    }
  }
  return { ApiClientError, api: { changeSalary: mocks.changeSalary } };
});

import { ApiClientError } from '@/lib/api-client';
import { SalaryChangeDialog } from './salary-change-dialog';

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

describe('SalaryChangeDialog', () => {
  it('sends a reason and version, then explains a stale edit conflict', async () => {
    mocks.changeSalary.mockRejectedValue(new ApiClientError(409, { error: { message: 'Conflict' } }));
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><SalaryChangeDialog employee={employee} open onClose={vi.fn()} /></QueryClientProvider>);

    fireEvent.change(screen.getByLabelText(/new annual base salary/i), { target: { value: '130000.00' } });
    fireEvent.change(screen.getByLabelText(/reason for change/i), { target: { value: 'Annual market adjustment' } });
    fireEvent.click(screen.getByRole('button', { name: /apply salary change/i }));

    await waitFor(() => expect(mocks.changeSalary).toHaveBeenCalledWith('emp-1', {
      salary: '130000.00',
      currency: 'GBP',
      reason: 'Annual market adjustment',
      version: 7,
    }));
    expect(await screen.findByText(/changed after you opened it/i)).toBeInTheDocument();
  });
  it('preserves the opened salary version when a background refresh arrives', async () => {
    mocks.changeSalary.mockRejectedValue(new ApiClientError(409, { error: { message: 'Conflict' } }));
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const onClose = vi.fn();
    const view = (record: typeof employee, open = true) => (
      <QueryClientProvider client={client}><SalaryChangeDialog employee={record} open={open} onClose={onClose} /></QueryClientProvider>
    );
    const { rerender } = render(view(employee));
    fireEvent.change(screen.getByLabelText(/new annual base salary/i), { target: { value: '130000.00' } });
    fireEvent.change(screen.getByLabelText(/reason for change/i), { target: { value: 'Annual review' } });
    const refreshed = { ...employee, salary: '140000.00', version: 8 };
    rerender(view(refreshed));
    expect(screen.getByLabelText(/new annual base salary/i)).toHaveValue('130000.00');
    fireEvent.click(screen.getByRole('button', { name: /apply salary change/i }));
    await waitFor(() => expect(mocks.changeSalary).toHaveBeenLastCalledWith('emp-1', {
      salary: '130000.00', currency: 'GBP', reason: 'Annual review', version: 7,
    }));
    rerender(view(refreshed, false));
    rerender(view(refreshed));
    expect(screen.getByLabelText(/new annual base salary/i)).toHaveValue('140000.00');
    expect(screen.getByLabelText(/reason for change/i)).toHaveValue('');
  });
});
