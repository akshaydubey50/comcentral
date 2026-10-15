import { describe, expect, it } from 'vitest';

import {
  MAX_IMPORT_BYTES,
  MAX_IMPORT_REQUEST_BYTES,
  normalizeEmployeeInput,
  normalizeEmployeeImport,
  validateSalary,
} from '@/shared/validation';

describe('employee validation', () => {
  it('allows salary deferral only for import and still validates every nonblank amount', () => {
    const employee = {
      employeeCode: 'DRAFT-001', name: 'Draft Employee', email: 'draft@example.invalid', country: 'BR',
      department: 'Engineering', jobRole: 'Analyst', employmentType: 'INTERN',
      joiningDate: '2020-02-29', currency: 'BRL',
    };
    for (const salary of [undefined, null, '', '  ']) {
      expect(normalizeEmployeeImport({ ...employee, salary }).salary).toBeNull();
      expect(() => normalizeEmployeeInput({ ...employee, salary })).toThrow();
    }
    for (const salary of ['0', '-1', '1.001', 'NaN']) {
      expect(() => normalizeEmployeeImport({ ...employee, salary })).toThrow();
    }
    expect(normalizeEmployeeImport({ ...employee, salary: '12345.67' }).salary).toBe('12345.67');
  });

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
