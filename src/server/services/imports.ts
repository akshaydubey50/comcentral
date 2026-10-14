import { createHash, timingSafeEqual } from 'node:crypto';

import type { EmployeeFilters, ImportError, ImportPreview, ImportResult } from '@/shared/contracts';
import { currencyPrecision } from '@/shared/validation';
import { EMPLOYEE_CSV_HEADERS, parseEmployeeCsv, toCsv } from '@/server/domain/csv';
import { getPrisma } from '@/server/db/prisma';
import { ApiError } from '@/server/http';
import { employeeWhere } from '@/server/services/employees';

export function importHash(csvText: string): string {
  return createHash('sha256').update(csvText, 'utf8').digest('hex');
}

function hashesMatch(expected: string, actual: string): boolean {
  const expectedBytes = Buffer.from(expected, 'hex');
  const actualBytes = Buffer.from(actual, 'hex');
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

export async function previewImport(csvText: string, now = new Date()): Promise<ImportPreview> {
  const parsed = parseEmployeeCsv(csvText, now);
  const errors: ImportError[] = [...parsed.errors];
  let errorCount = parsed.errorCount;

  if (parsed.rows.length > 0) {
    const existing = await getPrisma().employee.findMany({
      where: {
        OR: [
          { employeeCode: { in: parsed.rows.map((row) => row.employeeCode) } },
          { email: { in: parsed.rows.map((row) => row.email) } },
        ],
      },
      select: { employeeCode: true, email: true },
    });
    const codes = new Set(existing.map((row) => row.employeeCode));
    const emails = new Set(existing.map((row) => row.email));
    parsed.rows.forEach((row, index) => {
      const rowNumber = parsed.rowNumbers[index]!;
      if (codes.has(row.employeeCode)) {
        errorCount += 1;
        if (errors.length < 100) {
          errors.push({
            row: rowNumber,
            field: 'employeeCode',
            message: 'employeeCode already exists',
          });
        }
      }
      if (emails.has(row.email)) {
        errorCount += 1;
        if (errors.length < 100) {
          errors.push({
            row: rowNumber,
            field: 'email',
            message: 'normalized email already exists',
          });
        }
      }
    });
  }

  return {
    valid: errorCount === 0,
    totalRows: parsed.totalRows,
    preview: parsed.rows.slice(0, 20),
    errors,
    errorCount,
    previewHash: importHash(csvText),
  };
}

export async function commitImport(
  csvText: string,
  previewHash: string,
  now = new Date(),
): Promise<ImportResult> {
  const actualHash = importHash(csvText);
  if (!hashesMatch(previewHash, actualHash)) {
    throw new ApiError(409, 'IMPORT_CHANGED', 'CSV content changed after preview');
  }

  const preview = await previewImport(csvText, now);
  if (!preview.valid) {
    throw new ApiError(422, 'IMPORT_INVALID', 'CSV contains validation errors', {
      errors: preview.errors,
      errorCount: preview.errorCount,
    });
  }

  const parsed = parseEmployeeCsv(csvText, now);
  const prisma = getPrisma();
  try {
    await prisma.$transaction(
      async (tx) => {
        for (let offset = 0; offset < parsed.rows.length; offset += 500) {
          const batch = parsed.rows.slice(offset, offset + 500).map((row) => ({
            ...row,
            joiningDate: new Date(`${row.joiningDate}T00:00:00.000Z`),
          }));
          await tx.employee.createMany({ data: batch });
        }
      },
      { isolationLevel: 'Serializable', timeout: 120_000 },
    );
  } catch (error) {
    if (['P2002', 'P2034'].includes((error as { code?: string }).code ?? '')) {
      throw new ApiError(
        409,
        'IMPORT_CONFLICT',
        'Employee data changed or serialization conflicted; no rows were imported',
      );
    }
    throw error;
  }
  return { imported: parsed.rows.length };
}

export async function exportEmployees(filters: EmployeeFilters): Promise<string> {
  const records = await getPrisma().employee.findMany({
    where: employeeWhere(filters),
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
  });
  const rows = records.map((record) => [
    record.employeeCode,
    record.name,
    record.email,
    record.country,
    record.department,
    record.jobRole,
    record.employmentType,
    record.joiningDate.toISOString().slice(0, 10),
    record.salary.toFixed(currencyPrecision(record.currency)),
    record.currency,
  ]);
  return toCsv([EMPLOYEE_CSV_HEADERS, ...rows]);
}
