import Decimal from 'decimal.js';
import { z } from 'zod';

import {
  CURRENCIES,
  EMPLOYMENT_TYPES,
  type Currency,
  type EmployeeFilters,
  type EmployeeInput,
  type EmployeeImportInput,
  type EmployeeQuery,
  type EmployeeUpdate,
  type InsightsQuery,
  type SalaryChangeInput,
} from './contracts';

export const COUNTRY_OPTIONS = [
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'BR', name: 'Brazil', currency: 'BRL' },
  { code: 'CA', name: 'Canada', currency: 'CAD' },
  { code: 'DE', name: 'Germany', currency: 'EUR' },
  { code: 'FR', name: 'France', currency: 'EUR' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'US', name: 'United States', currency: 'USD' },
] as const satisfies ReadonlyArray<{ code: string; name: string; currency: Currency }>;

export const MAX_SALARY = new Decimal('999999999999.99');
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_REQUEST_BYTES = 4 * 1024 * 1024 + 1024;
export const MAX_IMPORT_ROWS = 10_000;

export class InputValidationError extends Error {
  readonly details: Array<{ field: string; message: string }>;

  constructor(field: string, message: string) {
    super(message);
    this.name = 'InputValidationError';
    this.details = [{ field, message }];
  }
}

const boundedText = (field: string, max: number) =>
  z
    .string({ error: `${field} must be text` })
    .trim()
    .min(1, `${field} is required`)
    .max(max, `${field} must be at most ${max} characters`);

const employeeCodeSchema = boundedText('employeeCode', 40).regex(
  /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
  'employeeCode may contain letters, numbers, periods, underscores, and hyphens',
);
const emailSchema = z
  .string({ error: 'email must be text' })
  .trim()
  .max(254, 'email must be at most 254 characters')
  .email('email must be valid')
  .transform((value) => value.toLowerCase());
const countrySchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .refine(
    (value) => COUNTRY_OPTIONS.some((country) => country.code === value),
    'country is not supported',
  );
const joiningDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'joiningDate must use YYYY-MM-DD');
const currencySchema = z.enum(CURRENCIES);
const employmentTypeSchema = z.enum(EMPLOYMENT_TYPES);

const employeeShape = {
  employeeCode: employeeCodeSchema,
  name: boundedText('name', 160),
  email: emailSchema,
  country: countrySchema,
  department: boundedText('department', 100),
  jobRole: boundedText('jobRole', 100),
  employmentType: employmentTypeSchema,
  joiningDate: joiningDateSchema,
};

const employeeInputSchema = z
  .object({
    ...employeeShape,
    salary: z.string().trim().min(1, 'salary is required'),
    currency: currencySchema,
  })
  .strict();

const employeeUpdateSchema = z
  .object({
    ...employeeShape,
    version: z.number().int().positive(),
  })
  .strict();

const employeeImportSchema = z.object({
  ...employeeShape,
  salary: z.string().trim().nullable().optional(),
  currency: currencySchema,
}).strict();

const salaryChangeSchema = z
  .object({
    salary: z.string().trim().min(1, 'salary is required'),
    currency: currencySchema,
    reason: boundedText('reason', 500),
    version: z.number().int().positive(),
  })
  .strict();

export const archiveInputSchema = z
  .object({ version: z.number().int().positive(), archived: z.boolean() })
  .strict();
export const importPreviewBodySchema = z.object({ csvText: z.string() }).strict();
export const importCommitBodySchema = z
  .object({
    csvText: z.string(),
    previewHash: z.string().regex(/^[a-f0-9]{64}$/),
    confirmed: z.literal(true),
  })
  .strict();

function ensureRealDate(date: string, field: string): void {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new InputValidationError(field, `${field} must be a real calendar date`);
  }
}

function ensureJoiningDate(joiningDate: string, now: Date): void {
  ensureRealDate(joiningDate, 'joiningDate');
  if (joiningDate > now.toISOString().slice(0, 10)) {
    throw new InputValidationError('joiningDate', 'joiningDate cannot be in the future');
  }
}

export function currencyPrecision(currency: Currency): number {
  return currency === 'JPY' ? 0 : 2;
}

export function validateSalary(value: string, currency: Currency): string {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    throw new InputValidationError('salary', 'salary must be a positive plain decimal');
  }
  const fractionLength = value.includes('.') ? (value.split('.')[1]?.length ?? 0) : 0;
  if (fractionLength > currencyPrecision(currency)) {
    throw new InputValidationError('salary', `${currency} salary exceeds supported precision`);
  }
  const amount = new Decimal(value);
  if (!amount.isFinite() || amount.lte(0) || amount.gt(MAX_SALARY)) {
    throw new InputValidationError(
      'salary',
      `salary must be greater than 0 and at most ${MAX_SALARY.toFixed(2)}`,
    );
  }
  return value;
}

export function normalizeEmployeeInput(input: unknown, now = new Date()): EmployeeInput {
  const parsed = employeeInputSchema.parse(input);
  ensureJoiningDate(parsed.joiningDate, now);
  validateSalary(parsed.salary, parsed.currency);
  return parsed;
}

/** Imports may defer pay; nonblank amounts retain the regular salary rules. */
export function normalizeEmployeeImport(input: unknown, now = new Date()): EmployeeImportInput {
  const parsed = employeeImportSchema.parse(input);
  ensureJoiningDate(parsed.joiningDate, now);
  const salary = parsed.salary === undefined || parsed.salary === null || parsed.salary === ''
    ? null
    : validateSalary(parsed.salary, parsed.currency);
  return { ...parsed, salary };
}

export function normalizeEmployeeUpdate(input: unknown, now = new Date()): EmployeeUpdate {
  const parsed = employeeUpdateSchema.parse(input);
  ensureJoiningDate(parsed.joiningDate, now);
  return parsed;
}

export function normalizeSalaryChange(input: unknown): SalaryChangeInput {
  const parsed = salaryChangeSchema.parse(input);
  validateSalary(parsed.salary, parsed.currency);
  return parsed;
}

const filterKeys = ['q', 'country', 'department', 'jobRole', 'employmentType', 'status', 'salaryStatus'] as const;

export function parseEmployeeFilters(searchParams: URLSearchParams): EmployeeFilters {
  const result: Record<string, string> = {};
  for (const key of filterKeys) {
    const value = searchParams.get(key)?.trim();
    if (value) result[key] = value;
  }
  return z
    .object({
      q: z.string().max(160).optional(),
      country: countrySchema.optional(),
      department: z.string().max(100).optional(),
      jobRole: z.string().max(100).optional(),
      employmentType: employmentTypeSchema.optional(),
      status: z.enum(['ACTIVE', 'ARCHIVED', 'ALL']).optional(),
      salaryStatus: z.enum(['PENDING', 'RECORDED']).optional(),
    })
    .strict()
    .parse(result);
}

export function parseEmployeeQuery(searchParams: URLSearchParams): EmployeeQuery {
  const filters = parseEmployeeFilters(searchParams);
  const pagination = z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(25),
      sortBy: z
        .enum(['name', 'employeeCode', 'joiningDate', 'salary', 'updatedAt'])
        .default('name'),
      sortOrder: z.enum(['asc', 'desc']).default('asc'),
    })
    .parse({
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
      sortBy: searchParams.get('sortBy') ?? undefined,
      sortOrder: searchParams.get('sortOrder') ?? undefined,
    });
  return { ...filters, ...pagination };
}

export function parseInsightsQuery(searchParams: URLSearchParams): InsightsQuery {
  return {
    ...parseEmployeeFilters(searchParams),
    currencyMode: z
      .enum(['NATIVE', 'USD'])
      .default('NATIVE')
      .parse(searchParams.get('currencyMode') ?? undefined),
    groupBy: z
      .enum(['country', 'department', 'jobRole'])
      .default('country')
      .parse(searchParams.get('groupBy') ?? undefined),
  };
}
