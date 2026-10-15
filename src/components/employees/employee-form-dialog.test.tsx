import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  employee: vi.fn(),
}));

vi.mock('@/lib/api-client', () => {
  class ApiClientError extends Error {
    readonly code: string;
    readonly details?: unknown;

    constructor(public readonly status: number, body?: { error?: { code?: string; message?: string; details?: unknown } }) {
      super(body?.error?.message);
      this.code = body?.error?.code ?? 'REQUEST_FAILED';
      this.details = body?.error?.details;
    }
  }
  return {
    ApiClientError,
    api: {
      createEmployee: mocks.createEmployee,
      updateEmployee: mocks.updateEmployee,
      employee: mocks.employee,
    },
  };
});

import { ApiClientError } from '@/lib/api-client';
import { EmployeeFormDialog } from './employee-form-dialog';

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
const latest = { ...employee, name: 'Grace Hopper', version: 8 };
const options = {
  countries: [{ code: 'GB', name: 'United Kingdom', currency: 'GBP' as const }],
  departments: ['Engineering'],
  jobRoles: ['Principal Engineer'],
  employmentTypes: ['FULL_TIME' as const],
  currencies: ['GBP' as const],
};

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

function renderDialog(client = new QueryClient({ defaultOptions: { mutations: { retry: false } } }), onClose = vi.fn()) {
  render(
    <QueryClientProvider client={client}>
      <EmployeeFormDialog open employee={employee} options={options} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { client, onClose };
}

describe('EmployeeFormDialog', () => {
  beforeEach(() => {
    mocks.createEmployee.mockReset();
    mocks.updateEmployee.mockReset();
    mocks.employee.mockReset();
  });

  it('updates a salary-pending employee without supplying or replacing compensation', async () => {
    const draft = { ...employee, salary: null };
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    mocks.updateEmployee.mockResolvedValue({ ...draft, name: 'Updated name', version: 8 });
    render(<QueryClientProvider client={client}><EmployeeFormDialog open employee={draft} options={options} onClose={vi.fn()} /></QueryClientProvider>);

    expect(screen.queryByLabelText(/annual base salary/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Updated name' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mocks.updateEmployee).toHaveBeenCalledWith('emp-1', {
      employeeCode: employee.employeeCode, name: 'Updated name', email: employee.email,
      country: employee.country, department: employee.department, jobRole: employee.jobRole,
      employmentType: employee.employmentType, joiningDate: employee.joiningDate, version: 7,
    }));
  });

  it('reloads the latest employee only after a version conflict action', async () => {
    mocks.updateEmployee.mockRejectedValue(new ApiClientError(409, {
      error: { code: 'VERSION_CONFLICT', message: 'Employee changed' },
    }));
    mocks.employee.mockResolvedValue(latest);
    renderDialog();

    expect(screen.getByLabelText(/employee code/i)).toHaveAttribute('maxlength', '40');
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute('maxlength', '160');
    const save = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(save);

    const reload = await screen.findByRole('button', { name: /reload latest/i });
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(mocks.updateEmployee).toHaveBeenCalledTimes(1);
    fireEvent.click(reload);
    await waitFor(() => expect(mocks.employee).toHaveBeenCalledWith('emp-1'));
    expect(await screen.findByDisplayValue('Grace Hopper')).toBeInTheDocument();
  });

  it('keeps the dialog open without a discard prompt while a save is pending', async () => {
    const pendingSave = deferred<typeof latest>();
    mocks.updateEmployee.mockReturnValue(pendingSave.promise);
    const { onClose } = renderDialog();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Draft name' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(mocks.updateEmployee).toHaveBeenCalledOnce());

    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    const dialog = screen.getByRole('dialog', { name: /edit employee details/i });
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    expect(confirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog).toBeInTheDocument();

    pendingSave.resolve(latest);
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    confirm.mockRestore();
  });

  it('keeps the dialog open and actions blocked while a conflict reload is pending', async () => {
    const pendingReload = deferred<typeof latest>();
    mocks.updateEmployee.mockRejectedValue(new ApiClientError(409, {
      error: { code: 'VERSION_CONFLICT', message: 'Employee changed' },
    }));
    mocks.employee.mockReturnValue(pendingReload.promise);
    const { onClose } = renderDialog();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Draft name' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    fireEvent.click(await screen.findByRole('button', { name: /reload latest/i }));
    await waitFor(() => expect(mocks.employee).toHaveBeenCalledOnce());

    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('dialog', { name: /edit employee details/i }), { key: 'Escape', code: 'Escape' });
    expect(confirm).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    pendingReload.resolve(latest);
    expect(await screen.findByDisplayValue('Grace Hopper')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('explains duplicate employee conflicts without stale-record guidance', async () => {
    mocks.updateEmployee.mockRejectedValue(new ApiClientError(409, {
      error: { code: 'DUPLICATE_EMPLOYEE', message: 'Duplicate employee' },
    }));
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/already uses this code or work email/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reload latest/i })).not.toBeInTheDocument();
  });

  it('invalidates directory, options, and insights after a successful save', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const onClose = vi.fn();
    mocks.updateEmployee.mockResolvedValue(latest);
    renderDialog(client, onClose);

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['employees'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['directory-options'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['insights'] });
  });
  it('preserves a draft during refetch and starts fresh when reopened', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    mocks.updateEmployee.mockResolvedValue(latest);
    const view = (record: typeof employee, open = true) => (
      <QueryClientProvider client={client}><EmployeeFormDialog open={open} employee={record} options={options} onClose={vi.fn()} /></QueryClientProvider>
    );
    const { rerender } = render(view(employee));
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Draft name' } });
    rerender(view(latest));
    expect(screen.getByLabelText(/full name/i)).toHaveValue('Draft name');
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(mocks.updateEmployee).toHaveBeenLastCalledWith('emp-1', expect.objectContaining({ name: 'Draft name', version: 7 })));
    rerender(view(latest, false));
    rerender(view(latest));
    expect(screen.getByLabelText(/full name/i)).toHaveValue('Grace Hopper');
  });
});
