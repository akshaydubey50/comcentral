import type {
  ApiErrorBody,
  DirectoryOptions,
  Employee,
  EmployeeFilters,
  EmployeeInput,
  EmployeePage,
  EmployeeQuery,
  EmployeeUpdate,
  FxStatus,
  HrUser,
  ImportPreview,
  ImportResult,
  Insights,
  InsightsQuery,
  SalaryChangeInput,
  SalaryHistory,
} from '@/shared/contracts';

type JsonValue = Record<string, unknown> | unknown[];

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, body?: unknown) {
    const envelope = body && typeof body === 'object' && 'error' in body
      ? (body as ApiErrorBody).error
      : undefined;
    const authError = body && typeof body === 'object'
      ? body as { code?: unknown; message?: unknown; details?: unknown }
      : undefined;
    const message = typeof envelope?.message === 'string'
      ? envelope.message
      : typeof authError?.message === 'string'
        ? authError.message
        : 'Something went wrong. Please try again.';
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = typeof envelope?.code === 'string'
      ? envelope.code
      : typeof authError?.code === 'string' ? authError.code : 'REQUEST_FAILED';
    this.details = envelope?.details ?? authError?.details;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    throw new ApiClientError(response.status, body);
  }
  return response.json() as Promise<T>;
}

function json(method: 'POST' | 'PATCH' | 'DELETE', body: JsonValue = {}): RequestInit {
  return { method, body: JSON.stringify(body) };
}

export function buildQuery(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const query = params.toString();
  return query ? '?' + query : '';
}

export const api = {
  session: () => request<{ user: HrUser | null }>('/api/session'),
  signIn: (email: string, password: string) =>
    request<unknown>('/api/auth/sign-in/email', json('POST', { email, password })),
  // The browser session uses an HttpOnly cookie; never retain the returned token.
  signUp: (name: string, email: string, password: string): Promise<void> =>
    request<unknown>('/api/auth/sign-up/email', json('POST', { name, email, password })).then(() => undefined),
  signOut: () => request<unknown>('/api/auth/sign-out', json('POST')),
  options: () => request<{ data: DirectoryOptions }>('/api/options').then((body) => body.data),

  employees: (query: EmployeeQuery) =>
    request<EmployeePage>('/api/employees' + buildQuery(query as unknown as Record<string, string | number | undefined>)),
  employee: (id: string) =>
    request<{ data: Employee }>('/api/employees/' + encodeURIComponent(id)).then((body) => body.data),
  createEmployee: (input: EmployeeInput) =>
    request<{ data: Employee }>('/api/employees', json('POST', input as unknown as JsonValue)).then((body) => body.data),
  updateEmployee: (id: string, input: EmployeeUpdate) =>
    request<{ data: Employee }>('/api/employees/' + encodeURIComponent(id), json('PATCH', input as unknown as JsonValue))
      .then((body) => body.data),
  deleteEmployee: (id: string, version: number) =>
    request<{ data: Employee }>('/api/employees/' + encodeURIComponent(id), json('DELETE', { version }))
      .then((body) => body.data),
  changeSalary: (id: string, input: SalaryChangeInput) =>
    request<{ data: Employee }>('/api/employees/' + encodeURIComponent(id) + '/salary', json('POST', input as unknown as JsonValue))
      .then((body) => body.data),
  setArchived: (id: string, version: number, archived: boolean) =>
    request<{ data: Employee }>('/api/employees/' + encodeURIComponent(id) + (archived ? '' : '/archive'),
      archived ? json('DELETE', { version }) : json('POST', { version, archived: false }))
      .then((body) => body.data),
  salaryHistory: (id: string) =>
    request<{ data: SalaryHistory[] }>('/api/employees/' + encodeURIComponent(id) + '/history').then((body) => body.data),
  exportEmployees: async (filters: EmployeeFilters) => {
    const response = await fetch('/api/employees/export' + buildQuery(filters as unknown as Record<string, string | undefined>), {
      credentials: 'same-origin',
      headers: { Accept: 'text/csv' },
    });
    if (!response.ok) throw new ApiClientError(response.status);
    return response.blob();
  },

  importTemplate: async () => {
    const response = await fetch('/api/imports/template', { credentials: 'same-origin', headers: { Accept: 'text/csv' } });
    if (!response.ok) throw new ApiClientError(response.status);
    return response.blob();
  },
  previewImport: (csvText: string) =>
    request<{ data: ImportPreview }>('/api/imports/preview', json('POST', { csvText })).then((body) => body.data),
  commitImport: (csvText: string, previewHash: string) =>
    request<{ data: ImportResult }>('/api/imports/commit', json('POST', { csvText, previewHash, confirmed: true }))
      .then((body) => body.data),

  insights: (query: InsightsQuery) =>
    request<{ data: Insights }>('/api/insights' + buildQuery(query as unknown as Record<string, string | undefined>)).then((body) => body.data),
  refreshFx: () => request<{ data: FxStatus }>('/api/fx/refresh', json('POST')).then((body) => body.data),
};

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
