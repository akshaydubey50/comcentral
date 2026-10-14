import { parse } from 'csv-parse/sync';
import { ZodError } from 'zod';

import type { EmployeeInput, ImportError } from '@/shared/contracts';
import {
  InputValidationError,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  normalizeEmployeeInput,
} from '@/shared/validation';

export const EMPLOYEE_CSV_HEADERS = [
  'employeeCode',
  'name',
  'email',
  'country',
  'department',
  'jobRole',
  'employmentType',
  'joiningDate',
  'salary',
  'currency',
] as const;

export interface ParsedEmployeeCsv {
  totalRows: number;
  rows: EmployeeInput[];
  rowNumbers: number[];
  errors: ImportError[];
  errorCount: number;
}

function addError(
  target: ImportError[],
  counter: { value: number },
  error: ImportError,
): void {
  counter.value += 1;
  if (target.length < 100) target.push(error);
}

export function parseEmployeeCsv(csvText: string, now = new Date()): ParsedEmployeeCsv {
  const errors: ImportError[] = [];
  const counter = { value: 0 };
  const byteLength = new TextEncoder().encode(csvText).byteLength;
  if (byteLength > MAX_IMPORT_BYTES) {
    addError(errors, counter, {
      row: 1,
      field: 'csvText',
      message: 'CSV exceeds the 2 MB limit',
    });
    return { totalRows: 0, rows: [], rowNumbers: [], errors, errorCount: counter.value };
  }

  let records: string[][];
  try {
    records = parse(csvText, {
      bom: true,
      columns: false,
      relax_column_count: true,
      skip_empty_lines: true,
      trim: false,
    }) as string[][];
  } catch {
    addError(errors, counter, {
      row: 1,
      field: 'csvText',
      message: 'CSV syntax is invalid',
    });
    return { totalRows: 0, rows: [], rowNumbers: [], errors, errorCount: counter.value };
  }

  const header = records[0] ?? [];
  const exactHeader =
    header.length === EMPLOYEE_CSV_HEADERS.length &&
    EMPLOYEE_CSV_HEADERS.every((name, index) => header[index] === name);
  if (!exactHeader) {
    addError(errors, counter, {
      row: 1,
      field: 'header',
      message: `Header must exactly equal: ${EMPLOYEE_CSV_HEADERS.join(',')}`,
    });
    return { totalRows: 0, rows: [], rowNumbers: [], errors, errorCount: counter.value };
  }

  const dataRows = records.slice(1);
  if (dataRows.length === 0) {
    addError(errors, counter, {
      row: 2,
      field: 'row',
      message: 'CSV must contain at least one employee row',
    });
  }
  if (dataRows.length > MAX_IMPORT_ROWS) {
    addError(errors, counter, {
      row: MAX_IMPORT_ROWS + 2,
      field: 'csvText',
      message: 'CSV exceeds the 10000 row limit',
    });
  }

  const rows: EmployeeInput[] = [];
  const rowNumbers: number[] = [];
  const seenCodes = new Map<string, number>();
  const seenEmails = new Map<string, number>();

  dataRows.slice(0, MAX_IMPORT_ROWS).forEach((values, index) => {
    const rowNumber = index + 2;
    if (values.length !== EMPLOYEE_CSV_HEADERS.length) {
      addError(errors, counter, {
        row: rowNumber,
        field: 'row',
        message: `Expected ${EMPLOYEE_CSV_HEADERS.length} columns`,
      });
      return;
    }

    const raw = Object.fromEntries(
      EMPLOYEE_CSV_HEADERS.map((name, columnIndex) => [name, values[columnIndex] ?? '']),
    );
    try {
      const employee = normalizeEmployeeInput(raw, now);
      const firstCodeRow = seenCodes.get(employee.employeeCode);
      if (firstCodeRow !== undefined) {
        addError(errors, counter, {
          row: rowNumber,
          field: 'employeeCode',
          message: `Duplicate employeeCode; first seen on row ${firstCodeRow}`,
        });
      } else {
        seenCodes.set(employee.employeeCode, rowNumber);
      }
      const firstEmailRow = seenEmails.get(employee.email);
      if (firstEmailRow !== undefined) {
        addError(errors, counter, {
          row: rowNumber,
          field: 'email',
          message: `Duplicate normalized email; first seen on row ${firstEmailRow}`,
        });
      } else {
        seenEmails.set(employee.email, rowNumber);
      }
      rows.push(employee);
      rowNumbers.push(rowNumber);
    } catch (error) {
      if (error instanceof InputValidationError) {
        for (const detail of error.details) {
          addError(errors, counter, { row: rowNumber, ...detail });
        }
      } else if (error instanceof ZodError) {
        for (const issue of error.issues) {
          addError(errors, counter, {
            row: rowNumber,
            field: issue.path.join('.') || 'row',
            message: issue.message,
          });
        }
      } else {
        throw error;
      }
    }
  });

  return { totalRows: dataRows.length, rows, rowNumbers, errors, errorCount: counter.value };
}

function protectFormula(value: string): string {
  return /^(?:\s*[=+\-@]|[\t\r\n])/u.test(value) ? `'${value}` : value;
}

function encodeCell(value: string): string {
  const protectedValue = protectFormula(value);
  return /[",\r\n]/.test(protectedValue)
    ? `"${protectedValue.replaceAll('"', '""')}"`
    : protectedValue;
}

export function toCsv(rows: ReadonlyArray<ReadonlyArray<string>>): string {
  return rows.map((row) => row.map(encodeCell).join(',')).join('\r\n') + '\r\n';
}
