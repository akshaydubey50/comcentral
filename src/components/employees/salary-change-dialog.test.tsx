import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ComponentProps } from 'react';

const mocks = vi.hoisted(() => ({ changeSalary: vi.fn(), employee: vi.fn() }));

vi.mock('@/lib/api-client', () => {
  class ApiClientError extends Error {
    readonly code: string;

    constructor(public status: number, body?: { error?: { code?: string; message?: string } }) {
      super(body?.error?.message);
      this.code = body?.error?.code ?? 'REQUEST_FAILED';
    }
  }
  return {
    ApiClientError,
    api: { changeSalary: mocks.changeSalary, employee: mocks.employee },
  };
});

// The dialog shell is a third-party modal implementation; these tests exercise
// the salary workflow without paying for portal, focus-trap, and transition work.
vi.mock('@mui/material', async (importOriginal) => {
  const material = await importOriginal<typeof import('@mui/material')>();
  return {
    ...material,
    Dialog: ({ open, children, 'aria-labelledby': labelledBy }: ComponentProps<typeof material.Dialog>) => (
      open ? <div role="dialog" aria-labelledby={labelledBy}>{children}</div> : null
    ),
  };
});

import { ApiClientError } from '@/lib/api-client';
import type { Employee } from '@/shared/contracts';
import { SalaryChangeDialog } from './salary-change-dialog';

const employee: Employee = {
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
  beforeEach(() => {
    mocks.changeSalary.mockReset();
    mocks.employee.mockReset();
  });

  it('adds the first salary from a blank amount with a reason and the opened version', async () => {
    const draft = { ...employee, salary: null, currency: 'BRL' as const, version: 1 };
    mocks.changeSalary.mockResolvedValue({ ...draft, salary: '12345.67', version: 2 });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const onClose = vi.fn();
    render(<QueryClientProvider client={client}><SalaryChangeDialog employee={draft} open onClose={onClose} /></QueryClientProvider>);
    const dialog = within(screen.getByRole('dialog', { name: /add annual salary/i }));
    expect(dialog.getByLabelText(/new annual base salary/i)).toHaveValue('');
    expect(dialog.getByText('Salary pending')).toBeInTheDocument();
    fireEvent.change(dialog.getByLabelText(/new annual base salary/i), { target: { value: '12345.67' } });
    fireEvent.change(dialog.getByLabelText(/reason for change/i), { target: { value: 'Initial compensation confirmed' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Add salary' }));

    await waitFor(() => expect(mocks.changeSalary).toHaveBeenCalledWith('emp-1', {
      salary: '12345.67', currency: 'BRL', reason: 'Initial compensation confirmed', version: 1,
    }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('reloads a stale salary only after an explicit action and requires a fresh review', async () => {
    const latest = { ...employee, salary: '140000.00', version: 8 };
    mocks.changeSalary
      .mockRejectedValueOnce(new ApiClientError(409, {
        error: { code: 'VERSION_CONFLICT', message: 'Conflict' },
      }))
      .mockResolvedValueOnce({ ...latest, salary: '145000.00', version: 9 });
    mocks.employee.mockResolvedValue(latest);
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><SalaryChangeDialog employee={employee} open onClose={vi.fn()} /></QueryClientProvider>);
    const dialog = within(screen.getByRole('dialog', { name: /change annual salary/i }));
    const salaryInput = dialog.getByLabelText(/new annual base salary/i);
    const reasonInput = dialog.getByLabelText(/reason for change/i);
    const submitButton = dialog.getByRole('button', { name: /apply salary change/i });

    fireEvent.change(salaryInput, { target: { value: '130000.00' } });
    fireEvent.change(reasonInput, { target: { value: 'Annual market adjustment' } });
    fireEvent.click(submitButton);

    expect(await dialog.findByText(/changed after you opened it/i)).toBeInTheDocument();
    expect(mocks.changeSalary).toHaveBeenCalledWith('emp-1', {
      salary: '130000.00',
      currency: 'GBP',
      reason: 'Annual market adjustment',
      version: 7,
    });
    expect(mocks.employee).not.toHaveBeenCalled();
    expect(submitButton).toBeDisabled();

    fireEvent.click(dialog.getByRole('button', { name: /reload latest/i }));

    expect(await dialog.findByText(/salary and reason were reset/i)).toBeInTheDocument();
    expect(mocks.employee).toHaveBeenCalledWith('emp-1');
    expect(salaryInput).toHaveValue('140000.00');
    expect(reasonInput).toHaveValue('');
    expect(mocks.changeSalary).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(submitButton).toBeEnabled());

    fireEvent.change(salaryInput, { target: { value: '145000.00' } });
    fireEvent.change(reasonInput, { target: { value: 'Reviewed against latest record' } });
    fireEvent.click(submitButton);

    await waitFor(() => expect(mocks.changeSalary).toHaveBeenLastCalledWith('emp-1', {
      salary: '145000.00',
      currency: 'GBP',
      reason: 'Reviewed against latest record',
      version: 8,
    }));
  });

  it('retains the salary draft when reloading the latest employee fails', async () => {
    mocks.changeSalary.mockRejectedValue(new ApiClientError(409, {
      error: { code: 'VERSION_CONFLICT', message: 'Conflict' },
    }));
    mocks.employee.mockRejectedValue(new Error('Network unavailable'));
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><SalaryChangeDialog employee={employee} open onClose={vi.fn()} /></QueryClientProvider>);

    fireEvent.change(screen.getByLabelText(/new annual base salary/i), { target: { value: '130000.00' } });
    fireEvent.change(screen.getByLabelText(/reason for change/i), { target: { value: 'Annual market adjustment' } });
    fireEvent.click(screen.getByRole('button', { name: /apply salary change/i }));
    fireEvent.click(await screen.findByRole('button', { name: /reload latest/i }));

    expect(await screen.findByText(/latest employee record could not be loaded/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/new annual base salary/i)).toHaveValue('130000.00');
    expect(screen.getByLabelText(/reason for change/i)).toHaveValue('Annual market adjustment');
    expect(screen.getByRole('button', { name: /apply salary change/i })).toBeDisabled();
    expect(mocks.changeSalary).toHaveBeenCalledTimes(1);
  });

  it('invalidates cached salary history after explicitly reloading a conflict', async () => {
    const latest = { ...employee, salary: '140000.00', version: 8 };
    mocks.changeSalary.mockRejectedValue(new ApiClientError(409, {
      error: { code: 'VERSION_CONFLICT', message: 'Conflict' },
    }));
    mocks.employee.mockResolvedValue(latest);
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    client.setQueryData(['salary-history', employee.id], [{ id: 'cached-history' }]);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    render(<QueryClientProvider client={client}><SalaryChangeDialog employee={employee} open onClose={vi.fn()} /></QueryClientProvider>);

    fireEvent.change(screen.getByLabelText(/reason for change/i), { target: { value: 'Annual review' } });
    fireEvent.click(screen.getByRole('button', { name: /apply salary change/i }));
    fireEvent.click(await screen.findByRole('button', { name: /reload latest/i }));

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['salary-history', employee.id],
    }));
    expect(mocks.changeSalary).toHaveBeenCalledTimes(1);
  });

  it('disables salary submission when an explicit reload finds the employee archived', async () => {
    const archived = { ...employee, status: 'ARCHIVED' as const, version: 8 };
    mocks.changeSalary.mockRejectedValue(new ApiClientError(409, {
      error: { code: 'VERSION_CONFLICT', message: 'Conflict' },
    }));
    mocks.employee.mockResolvedValue(archived);
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><SalaryChangeDialog employee={employee} open onClose={vi.fn()} /></QueryClientProvider>);

    fireEvent.change(screen.getByLabelText(/reason for change/i), { target: { value: 'Annual review' } });
    fireEvent.click(screen.getByRole('button', { name: /apply salary change/i }));
    fireEvent.click(await screen.findByRole('button', { name: /reload latest/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /apply salary change/i })).toBeDisabled());
    expect(screen.getByText(/salary and reason were reset/i)).toBeInTheDocument();
    expect(mocks.changeSalary).toHaveBeenCalledTimes(1);
  });

  it('preserves the opened salary version when a background refresh arrives', async () => {
    mocks.changeSalary.mockRejectedValue(new ApiClientError(409, {
      error: { code: 'VERSION_CONFLICT', message: 'Conflict' },
    }));
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const onClose = vi.fn();
    const view = (record: Employee, open = true) => (
      <QueryClientProvider client={client}><SalaryChangeDialog employee={record} open={open} onClose={onClose} /></QueryClientProvider>
    );
    const { rerender } = render(view(employee));
    fireEvent.change(screen.getByLabelText(/new annual base salary/i), { target: { value: '130000.00' } });
    fireEvent.change(screen.getByLabelText(/reason for change/i), { target: { value: 'Annual review' } });
    const refreshed = { ...employee, salary: '140000.00', status: 'ARCHIVED' as const, version: 8 };
    rerender(view(refreshed));
    expect(screen.getByLabelText(/new annual base salary/i)).toHaveValue('130000.00');
    expect(screen.getByRole('button', { name: /apply salary change/i })).toBeEnabled();
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
