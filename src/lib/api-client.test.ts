import { afterEach, describe, expect, it, vi } from 'vitest';

import { api, ApiClientError, buildQuery } from './api-client';

afterEach(() => vi.unstubAllGlobals());

describe('registration transport', () => {
  it('sends only account fields with same-origin cookies and discards the returned session token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ token: 'test-only-token', user: { id: 'hr' } })));
    vi.stubGlobal('fetch', fetchMock);
    expect(await api.signUp('Ada HR', 'ada@example.test', 'test-password')).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/auth/sign-up/email', expect.objectContaining({
      method: 'POST', credentials: 'same-origin',
      body: JSON.stringify({ name: 'Ada HR', email: 'ada@example.test', password: 'test-password' }),
    }));
  });

  it('preserves the signup error code for actionable form feedback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', message: 'Duplicate',
    }), { status: 422 })));
    await expect(api.signUp('Ada', 'ada@example.test', 'test-password')).rejects.toMatchObject({
      status: 422, code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
    });
  });
});

describe('buildQuery', () => {
  it('serializes only defined filters and keeps pagination numeric', () => {
    expect(buildQuery({ q: 'Ada Lovelace', status: 'ALL', page: 2, country: undefined }))
      .toBe('?q=Ada+Lovelace&status=ALL&page=2');
  });
});

describe('employee deletion transport', () => {
  it.each(['deleteEmployee', 'setArchived'] as const)('uses authenticated version-checked DELETE through %s', async (operation) => {
    const employee = { id: 'employee/1', status: 'ARCHIVED', version: 4 };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: employee })));
    vi.stubGlobal('fetch', fetchMock);
    const result = operation === 'deleteEmployee'
      ? await api.deleteEmployee('employee/1', 3)
      : await api.setArchived('employee/1', 3, true);
    expect(result).toEqual(employee);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/employees/employee%2F1', expect.objectContaining({
      method: 'DELETE', credentials: 'same-origin', body: JSON.stringify({ version: 3 }),
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
  });

  it('restores using the existing archive endpoint and current version', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { status: 'ACTIVE' } })));
    vi.stubGlobal('fetch', fetchMock);
    await api.setArchived('employee-1', 4, false);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/employees/employee-1/archive', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ version: 4, archived: false }),
    }));
  });
});

describe('ApiClientError', () => {
  it('keeps the response code, status, and safe field details', () => {
    const error = new ApiClientError(409, {
      error: { code: 'VERSION_CONFLICT', message: 'Record changed', details: { version: 4 } },
    });
    expect(error.status).toBe(409);
    expect(error.code).toBe('VERSION_CONFLICT');
    expect(error.details).toEqual({ version: 4 });
  });

  it('normalizes Better Auth error responses', () => {
    const error = new ApiClientError(401, { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid credentials' });
    expect(error.code).toBe('INVALID_EMAIL_OR_PASSWORD');
    expect(error.message).toBe('Invalid credentials');
  });
});
