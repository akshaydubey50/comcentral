import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { Employee } from '@/shared/contracts';

const mocks = vi.hoisted(() => ({
  search: '',
  push: vi.fn(),
  employees: vi.fn(),
  options: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  employee: vi.fn(),
  exportEmployees: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/employees',
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

vi.mock('@/lib/api-client', () => {
  class ApiClientError extends Error {
    readonly code = 'REQUEST_FAILED';
  }
  return {
    ApiClientError,
    api: {
      employees: mocks.employees,
      employee: mocks.employee,
      options: mocks.options,
      createEmployee: mocks.createEmployee,
      updateEmployee: mocks.updateEmployee,
      exportEmployees: mocks.exportEmployees,
    },
    downloadBlob: vi.fn(),
  };
});

vi.mock('./employee-table', () => ({
  EmployeeTable: ({ employees, onEdit, editDisabled, onSort }: {
    employees: Employee[];
    onEdit: (employee: Employee) => void;
    editDisabled: boolean;
    onSort: (key: 'salary') => void;
  }) => (
    <div>
      Employee rows: {employees[0]?.id}
      <button onClick={() => onSort('salary')}>Sort by annual salary</button>
      {employees[0] && <button disabled={editDisabled} onClick={() => onEdit(employees[0]!)}>Edit employee details for {employees[0].name}</button>}
    </div>
  ),
}));
vi.mock('./employee-cards', () => ({
  EmployeeCards: ({ employees }: { employees: Array<{ id: string }> }) => (
    <div>Employee cards: {employees[0]?.id}</div>
  ),
}));
import { EmployeeDirectory } from './employee-directory';

const employee: Employee = {
  id: 'employee-1', employeeCode: 'ACME-001', name: 'Ada Lovelace', email: 'ada@acme.test',
  country: 'GB', department: 'Engineering', jobRole: 'Analyst', employmentType: 'FULL_TIME',
  joiningDate: '2020-01-02', salary: '125000.00', currency: 'GBP', status: 'ACTIVE', version: 7,
  createdAt: '2020-01-02T00:00:00.000Z', updatedAt: '2026-10-14T00:00:00.000Z',
};

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
  const view = render(<QueryClientProvider client={client}><EmployeeDirectory /></QueryClientProvider>);
  return {
    ...view,
    rerenderDirectory: () => view.rerender(
      <QueryClientProvider client={client}><EmployeeDirectory /></QueryClientProvider>,
    ),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('EmployeeDirectory', () => {
  beforeEach(() => {
    mocks.search = '';
    mocks.push.mockReset();
    mocks.employees.mockReset();
    mocks.options.mockReset();
    mocks.createEmployee.mockReset();
    mocks.updateEmployee.mockReset();
    mocks.employee.mockReset();
    mocks.exportEmployees.mockReset();
    mocks.exportEmployees.mockResolvedValue(new Blob(['employeeCode,name\n']));
    mocks.employees.mockResolvedValue({
      data: [employee],
      pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    mocks.options.mockResolvedValue(options);
    mocks.updateEmployee.mockResolvedValue({ ...employee, name: 'Ada Updated', version: 8 });
  });

  it('sends normalized URL state to the employee API', async () => {
    mocks.search = 'q=Ada&page=bad&pageSize=bad&status=UNKNOWN&employmentType=UNSUPPORTED&sortBy=other&sortOrder=desc';

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

  it('renders table and card presentations from the same employee result', async () => {
    renderDirectory();

    expect(await screen.findByText('Employee rows: employee-1')).toBeInTheDocument();
    expect(screen.getByText('Employee cards: employee-1')).toBeInTheDocument();
  });

  it('counts a non-default status as an active filter', async () => {
    mocks.search = 'status=ARCHIVED';
    renderDirectory();

    expect(await screen.findByText('1 filter')).toBeInTheDocument();
  });

  it('keeps search explicit and resets pagination when the form is submitted', async () => {
    mocks.search = 'page=4&pageSize=25&sortBy=updatedAt&sortOrder=desc&status=ACTIVE';
    renderDirectory();
    await screen.findByText('Employee rows: employee-1');
    mocks.employees.mockClear();

    fireEvent.change(screen.getByLabelText('Search employees'), { target: { value: 'Ada Lovelace' } });

    expect(mocks.employees).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByRole('button', { name: 'Apply filters' }).closest('form')!);

    expect(mocks.push).toHaveBeenCalledTimes(1);
    const target = new URL(mocks.push.mock.calls[0][0], 'https://comcentral.test');
    expect(target.pathname).toBe('/employees');
    expect(target.searchParams.get('q')).toBe('Ada Lovelace');
    expect(target.searchParams.get('page')).toBe('1');
    expect(target.searchParams.get('sortBy')).toBe('updatedAt');
    expect(target.searchParams.get('sortOrder')).toBe('desc');
  });

  it('submits every filter only after Apply filters is selected', async () => {
    renderDirectory();
    await screen.findByText('Employee rows: employee-1');
    mocks.push.mockClear();

    expect(screen.getByText(/select Apply filters to update the results/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search employees'), { target: { value: 'Ada' } });
    for (const [label, option] of [
      ['Status', 'Archived'],
      ['Country', 'United Kingdom'],
      ['Department', 'Engineering'],
      ['Job role', 'Analyst'],
      ['Employment type', 'Full time'],
      ['Salary status', 'Salary pending'],
    ] as const) {
      fireEvent.mouseDown(screen.getByLabelText(label));
      fireEvent.click(await screen.findByRole('option', { name: option }));
    }

    expect(mocks.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

    const target = new URL(mocks.push.mock.calls[0][0], 'https://comcentral.test');
    expect(Object.fromEntries(target.searchParams)).toMatchObject({
      q: 'Ada', country: 'GB', department: 'Engineering', jobRole: 'Analyst',
      employmentType: 'FULL_TIME', status: 'ARCHIVED', salaryStatus: 'PENDING', page: '1',
    });
  });

  it('applies search when Enter is pressed and preserves the current sort', async () => {
    const user = userEvent.setup();
    mocks.search = 'page=4&pageSize=50&sortBy=salary&sortOrder=desc&country=GB';
    renderDirectory();
    await screen.findByText('Employee rows: employee-1');
    const search = screen.getByLabelText('Search employees');
    fireEvent.change(search, { target: { value: 'Ada' } });
    search.focus();
    await user.keyboard('{Enter}');

    expect(mocks.push).toHaveBeenCalledTimes(1);
    const target = new URL(mocks.push.mock.calls[0][0], 'https://comcentral.test');
    expect(Object.fromEntries(target.searchParams)).toMatchObject({
      q: 'Ada', country: 'GB', page: '1', pageSize: '50', sortBy: 'salary', sortOrder: 'desc',
    });
  });

  it('exports the applied salary-status population rather than a filter draft', async () => {
    mocks.search = 'country=GB&status=ALL&salaryStatus=PENDING';
    renderDirectory();
    await screen.findByText('Employee rows: employee-1');
    expect(mocks.employees).toHaveBeenCalledWith(expect.objectContaining({ salaryStatus: 'PENDING' }));
    expect(screen.getByLabelText('Salary status')).toHaveTextContent('Salary pending');
    fireEvent.change(screen.getByLabelText('Search employees'), { target: { value: 'Unsubmitted draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Export matching' }));
    await waitFor(() => expect(mocks.exportEmployees).toHaveBeenCalledWith(expect.objectContaining({ country: 'GB', status: 'ALL', salaryStatus: 'PENDING', q: undefined })));
  });

  it('clears every applied filter while retaining page size and sort', async () => {
    mocks.search = 'q=Ada&country=GB&department=Engineering&jobRole=Analyst&employmentType=FULL_TIME&salaryStatus=PENDING&status=ARCHIVED&page=4&pageSize=50&sortBy=salary&sortOrder=desc';
    renderDirectory();
    await screen.findByText('Employee rows: employee-1');

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    const target = new URL(mocks.push.mock.calls[0][0], 'https://comcentral.test');
    for (const filter of ['q', 'country', 'department', 'jobRole', 'employmentType', 'salaryStatus']) {
      expect(target.searchParams.has(filter)).toBe(false);
    }
    expect(Object.fromEntries(target.searchParams)).toMatchObject({
      status: 'ACTIVE', page: '1', pageSize: '50', sortBy: 'salary', sortOrder: 'desc',
    });
    expect(screen.getByLabelText('Search employees')).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveTextContent('Active');
  });

  it.each([
    ['First', '1'], ['Previous', '2'], ['Next', '4'], ['Last', '5'],
  ])('navigates with %s while retaining every applied filter and sort', async (button, page) => {
    mocks.search = 'q=Ada&country=GB&department=Engineering&jobRole=Analyst&employmentType=FULL_TIME&salaryStatus=PENDING&status=ALL&page=3&pageSize=25&sortBy=salary&sortOrder=desc';
    mocks.employees.mockResolvedValue({ data: [employee], pagination: { page: 3, pageSize: 25, total: 125, totalPages: 5 } });
    renderDirectory();

    fireEvent.click(await screen.findByRole('button', { name: button }));
    const target = new URL(mocks.push.mock.calls[0][0], 'https://comcentral.test');
    expect(Object.fromEntries(target.searchParams)).toMatchObject({
      q: 'Ada', country: 'GB', department: 'Engineering', jobRole: 'Analyst', employmentType: 'FULL_TIME',
      status: 'ALL', salaryStatus: 'PENDING', page, pageSize: '25', sortBy: 'salary', sortOrder: 'desc',
    });
  });

  it.each([
    [1, 3, true, false], [3, 3, false, true], [1, 1, true, true], [1, 0, true, true],
  ])('disables unavailable navigation at page %i of %i', async (page, totalPages, startDisabled, endDisabled) => {
    mocks.search = 'page=' + page;
    mocks.employees.mockResolvedValue({ data: totalPages === 0 ? [] : [employee], pagination: { page, pageSize: 25, total: totalPages * 25, totalPages } });
    renderDirectory();

    const first = await screen.findByRole('button', { name: 'First' });
    expect(first).toHaveProperty('disabled', startDisabled);
    expect(screen.getByRole('button', { name: 'Previous' })).toHaveProperty('disabled', startDisabled);
    expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', endDisabled);
    expect(screen.getByRole('button', { name: 'Last' })).toHaveProperty('disabled', endDisabled);
  });

  it('retains numeric page navigation alongside the four labelled controls', async () => {
    mocks.search = 'q=Ada&country=GB&page=1&pageSize=25&sortBy=salary&sortOrder=desc';
    mocks.employees.mockResolvedValue({ data: [employee], pagination: { page: 1, pageSize: 25, total: 75, totalPages: 3 } });
    renderDirectory();

    fireEvent.click(await screen.findByRole('button', { name: 'Go to page 2' }));
    for (const name of ['First', 'Previous', 'Next', 'Last']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    const target = new URL(mocks.push.mock.calls[0][0], 'https://comcentral.test');
    expect(Object.fromEntries(target.searchParams)).toMatchObject({
      q: 'Ada', country: 'GB', page: '2', pageSize: '25', sortBy: 'salary', sortOrder: 'desc',
    });
  });

  it.each([[12, 1], [27, 2]])('offers recovery when the requested page no longer exists with %i matches over %i pages', async (total, totalPages) => {
    mocks.search = 'page=8&country=GB&status=ARCHIVED&sortBy=salary&sortOrder=desc';
    mocks.employees.mockResolvedValue({ data: [], pagination: { page: 8, pageSize: 25, total, totalPages } });
    renderDirectory();

    expect(await screen.findByRole('heading', { name: 'This page is no longer available' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to first page' }));
    const target = new URL(mocks.push.mock.calls[0][0], 'https://comcentral.test');
    expect(Object.fromEntries(target.searchParams)).toMatchObject({
      page: '1', country: 'GB', status: 'ARCHIVED', sortBy: 'salary', sortOrder: 'desc',
    });
  });

  it('resets sorting to page one and keeps a subsequent filter apply on the updated sort', async () => {
    mocks.search = 'q=Ada&page=4&pageSize=50&sortBy=name&sortOrder=asc';
    const view = renderDirectory();
    fireEvent.click(await screen.findByRole('button', { name: 'Sort by annual salary' }));
    const sorted = new URL(mocks.push.mock.calls[0][0], 'https://comcentral.test');
    expect(Object.fromEntries(sorted.searchParams)).toMatchObject({ q: 'Ada', page: '1', pageSize: '50', sortBy: 'salary', sortOrder: 'asc' });
    mocks.search = sorted.searchParams.toString();
    view.rerenderDirectory();
    fireEvent.change(screen.getByLabelText('Search employees'), { target: { value: 'Grace' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    const filtered = new URL(mocks.push.mock.calls[1][0], 'https://comcentral.test');
    expect(Object.fromEntries(filtered.searchParams)).toMatchObject({ q: 'Grace', page: '1', pageSize: '50', sortBy: 'salary', sortOrder: 'asc' });
  });

  it('opens the selected row in the metadata form and saves with its opening version', async () => {
    renderDirectory();

    fireEvent.click(await screen.findByRole('button', { name: 'Edit employee details for Ada Lovelace' }));
    expect(screen.getByRole('dialog', { name: 'Edit employee details' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: /full name/i }), { target: { value: 'Ada Updated' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mocks.updateEmployee).toHaveBeenCalledWith('employee-1', {
      employeeCode: 'ACME-001', name: 'Ada Updated', email: 'ada@acme.test', country: 'GB',
      department: 'Engineering', jobRole: 'Analyst', employmentType: 'FULL_TIME',
      joiningDate: '2020-01-02', version: 7,
    }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit employee details' })).not.toBeInTheDocument());
  });

  it('clears submitted filters and restores the URL draft on browser history navigation', async () => {
    mocks.search = 'q=Ada&page=3&status=ACTIVE';
    const view = renderDirectory();
    await screen.findByDisplayValue('Ada');

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(screen.getByLabelText('Search employees')).toHaveValue('');
    const target = new URL(mocks.push.mock.calls[0][0], 'https://comcentral.test');
    expect(target.searchParams.has('q')).toBe(false);
    expect(target.searchParams.get('page')).toBe('1');

    mocks.search = target.searchParams.toString();
    view.rerenderDirectory();
    expect(screen.getByLabelText('Search employees')).toHaveValue('');

    mocks.search = 'q=Ada&page=3&status=ACTIVE';
    view.rerenderDirectory();
    expect(screen.getByLabelText('Search employees')).toHaveValue('Ada');

    mocks.search = 'q=Grace&page=1&status=ACTIVE';
    view.rerenderDirectory();
    expect(screen.getByLabelText('Search employees')).toHaveValue('Grace');
  });

  it('does not let an earlier response replace results for the current URL', async () => {
    const older = deferred<{ data: Array<{ id: string }>; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>();
    const newer = deferred<{ data: Array<{ id: string }>; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>();
    mocks.search = 'q=Ada';
    mocks.employees.mockImplementation(({ q }: { q?: string }) => q === 'Ada' ? older.promise : newer.promise);
    const view = renderDirectory();
    await waitFor(() => expect(mocks.employees).toHaveBeenCalledWith(expect.objectContaining({ q: 'Ada' })));

    mocks.search = 'q=Grace';
    view.rerenderDirectory();
    await waitFor(() => expect(mocks.employees).toHaveBeenCalledWith(expect.objectContaining({ q: 'Grace' })));
    expect(screen.getByLabelText('Loading employees')).toBeInTheDocument();
    newer.resolve({
      data: [{ id: 'grace' }],
      pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    expect(await screen.findByText('Employee rows: grace')).toBeInTheDocument();

    older.resolve({
      data: [{ id: 'ada' }],
      pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    });
    await waitFor(() => expect(screen.getByText('Employee rows: grace')).toBeInTheDocument());
    expect(screen.queryByText('Employee rows: ada')).not.toBeInTheDocument();
  });

  it('keeps employee creation unavailable until required country options load', async () => {
    mocks.options.mockReturnValue(new Promise(() => undefined));

    renderDirectory();

    expect(screen.getByRole('button', { name: /add employee/i })).toBeDisabled();
    expect(await screen.findByRole('button', { name: 'Edit employee details for Ada Lovelace' })).toBeDisabled();
    expect(screen.getByText(/editing is available after filter choices load/i)).toBeInTheDocument();
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
