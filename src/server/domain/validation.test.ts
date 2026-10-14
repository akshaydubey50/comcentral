import { describe, expect, it } from 'vitest';

import {
  MAX_IMPORT_BYTES,
  MAX_IMPORT_REQUEST_BYTES,
  normalizeEmployeeInput,
  validateSalary,
} from '@/shared/validation';

describe('employee validation', () => {
  it('normalizes bounded employee input and lowercase email', () => {
    expect(
      normalizeEmployeeInput(
        {
          employeeCode: ' ACME-001 ',
          name: ' Ada Lovelace ',
          email: ' ADA@EXAMPLE.COM ',
          country: 'gb',
          department: ' Engineering ',
          jobRole: ' Principal Engineer ',
          employmentType: 'FULL_TIME',
          joiningDate: '2020-02-29',
          salary: '100000.50',
          currency: 'GBP',
        },
        new Date('2026-10-14T12:00:00Z'),
      ),
    ).toEqual({
      employeeCode: 'ACME-001',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      country: 'GB',
      department: 'Engineering',
      jobRole: 'Principal Engineer',
      employmentType: 'FULL_TIME',
      joiningDate: '2020-02-29',
      salary: '100000.50',
      currency: 'GBP',
    });
  });



  it('allows JSON escaping overhead while retaining a 2 MiB decoded CSV cap', () => {
    const csvText = '"'.repeat(MAX_IMPORT_BYTES);
    const envelopeBytes = new TextEncoder().encode(JSON.stringify({ csvText })).byteLength;
    expect(envelopeBytes).toBeLessThanOrEqual(MAX_IMPORT_REQUEST_BYTES);
  });

  it('rejects unsupported precision and future joining dates', () => {
    expect(() => validateSalary('100.01', 'JPY')).toThrow(/precision/i);
    expect(() =>
      normalizeEmployeeInput(
        {
          employeeCode: 'ACME-001',
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          country: 'GB',
          department: 'Engineering',
          jobRole: 'Principal Engineer',
          employmentType: 'FULL_TIME',
          joiningDate: '2026-10-15',
          salary: '100000',
          currency: 'GBP',
        },
        new Date('2026-10-14T12:00:00Z'),
      ),
    ).toThrow(/future/i);
  });
});
