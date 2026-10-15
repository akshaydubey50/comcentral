import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Employee } from '@/shared/contracts';
import { ApiError } from '@/server/http';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  archiveEmployee: vi.fn(),
  getEmployee: vi.fn(),
  updateEmployee: vi.fn(),
}));

vi.mock('@/server/auth', () => ({
  getAuth: () => ({ api: { getSession: mocks.getSession } }),
}));

vi.mock('@/server/services/employees', () => ({
  archiveEmployee: mocks.archiveEmployee,
  getEmployee: mocks.getEmployee,
  updateEmployee: mocks.updateEmployee,
}));

import { DELETE } from './route';

const ORIGIN = 'http://localhost:3000';
const actor = { id: 'route-user', name: 'Route User', email: 'route-user@example.invalid' };
const archivedEmployee: Employee = {
  id: 'employee-1',
  employeeCode: 'EMP-1',
  name: 'Employee One',
  email: 'employee-1@example.invalid',
  country: 'US',
  department: 'Engineering',
  jobRole: 'Engineer',
  employmentType: 'FULL_TIME',
  joiningDate: '2020-01-01',
  salary: '100000.00',
  currency: 'USD',
  status: 'ARCHIVED',
  version: 4,
  createdAt: '2026-10-15T00:00:00.000Z',
  updatedAt: '2026-10-15T00:00:01.000Z',
};

function request(
  body: unknown,
  options: { origin?: string; contentType?: string; raw?: boolean } = {},
): Request {
  return new Request(`${ORIGIN}/api/employees/employee-1`, {
    method: 'DELETE',
    headers: {
      origin: options.origin ?? ORIGIN,
      'content-type': options.contentType ?? 'application/json',
    },
    body: options.raw ? String(body) : JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ id: 'employee-1' }) };

describe('DELETE /api/employees/[id]', () => {
  beforeEach(() => {
    vi.stubEnv('BETTER_AUTH_URL', ORIGIN);
    mocks.getSession.mockResolvedValue({ user: actor });
    mocks.archiveEmployee.mockResolvedValue(archivedEmployee);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('archives with the supplied version and returns the employee envelope', async () => {
    const response = await DELETE(request({ version: 3 }), context);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: archivedEmployee });
    expect(mocks.archiveEmployee).toHaveBeenCalledWith('employee-1', 3, true);
  });

  it('rejects an unauthenticated request before delegation', async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await DELETE(request({ version: 3 }), context);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'UNAUTHORIZED' } });
    expect(mocks.archiveEmployee).not.toHaveBeenCalled();
  });

  it('rejects foreign origins and unsupported content types', async () => {
    const foreign = await DELETE(request({ version: 3 }, {
      origin: 'https://untrusted.example',
    }), context);
    expect(foreign.status).toBe(403);
    await expect(foreign.json()).resolves.toMatchObject({ error: { code: 'ORIGIN_REJECTED' } });

    const unsupported = await DELETE(request({ version: 3 }, {
      contentType: 'text/plain',
    }), context);
    expect(unsupported.status).toBe(415);
    await expect(unsupported.json()).resolves.toMatchObject({
      error: { code: 'UNSUPPORTED_MEDIA_TYPE' },
    });
    expect(mocks.archiveEmployee).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'malformed JSON', body: '{', raw: true, status: 400, code: 'INVALID_JSON' },
    { name: 'missing version', body: {}, status: 422, code: 'VALIDATION_ERROR' },
    { name: 'non-positive version', body: { version: 0 }, status: 422, code: 'VALIDATION_ERROR' },
    { name: 'fractional version', body: { version: 3.5 }, status: 422, code: 'VALIDATION_ERROR' },
    { name: 'string version', body: { version: '3' }, status: 422, code: 'VALIDATION_ERROR' },
    {
      name: 'unexpected fields',
      body: { version: 3, archived: true },
      status: 422,
      code: 'VALIDATION_ERROR',
    },
  ])('rejects $name', async ({ body, raw, status, code }) => {
    const response = await DELETE(request(body, { raw }), context);

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ error: { code } });
    expect(mocks.archiveEmployee).not.toHaveBeenCalled();
  });

  it('enforces the mutation body limit before validation', async () => {
    const response = await DELETE(request({ version: 3, padding: 'x'.repeat(70 * 1024) }), context);

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ error: { code: 'PAYLOAD_TOO_LARGE' } });
    expect(mocks.archiveEmployee).not.toHaveBeenCalled();
  });

  it.each([
    { status: 409, code: 'VERSION_CONFLICT', message: 'Employee was changed by another request' },
    { status: 404, code: 'EMPLOYEE_NOT_FOUND', message: 'Employee was not found' },
  ])('preserves the $status service error', async ({ status, code, message }) => {
    mocks.archiveEmployee.mockRejectedValue(new ApiError(status, code, message));

    const response = await DELETE(request({ version: 3 }), context);

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ error: { code, message } });
    expect(mocks.archiveEmployee).toHaveBeenCalledWith('employee-1', 3, true);
  });
});
