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

vi.mock('./employee-table', () => ({
  EmployeeTable: ({ employees }: { employees: Array<{ id: string }> }) => (
    <div>Employee rows: {employees[0]?.id}</div>
  ),
}));
vi.mock('./employee-cards', () => ({
  EmployeeCards: ({ employees }: { employees: Array<{ id: string }> }) => (
    <div>Employee cards: {employees[0]?.id}</div>
  ),
}));
vi.mock('./employee-form-dialog', () => ({
  EmployeeFormDialog: () => null,
}));

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

  it('renders table and card presentations from the same employee result', async () => {
    renderDirectory();

    expect(await screen.findByText('Employee rows: employee-1')).toBeInTheDocument();
    expect(screen.getByText('Employee cards: employee-1')).toBeInTheDocument();
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
