import { describe, expect, it } from 'vitest';

import { ApiClientError, buildQuery } from './api-client';

describe('buildQuery', () => {
  it('serializes only defined filters and keeps pagination numeric', () => {
    expect(buildQuery({ q: 'Ada Lovelace', status: 'ALL', page: 2, country: undefined }))
      .toBe('?q=Ada+Lovelace&status=ALL&page=2');
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
