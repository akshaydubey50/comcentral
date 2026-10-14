import {
  EMPLOYMENT_TYPES,
  type EmployeeQuery,
  type EmployeeSort,
  type InsightsQuery,
} from '@/shared/contracts';

type SearchParamsReader = Pick<URLSearchParams, 'get'>;

const employeeStatuses = ['ACTIVE', 'ARCHIVED', 'ALL'] as const;
const employeeSorts: readonly EmployeeSort[] = [
  'name',
  'employeeCode',
  'joiningDate',
  'salary',
  'updatedAt',
];
const groupings = ['country', 'department', 'jobRole'] as const;

function optionalValue(search: SearchParamsReader, key: string): string | undefined {
  return search.get(key) || undefined;
}

function allowedValue<const T extends readonly string[]>(
  value: string | null,
  allowed: T,
): T[number] | undefined {
  return value && (allowed as readonly string[]).includes(value) ? value as T[number] : undefined;
}

function positiveInteger(
  value: string | null,
  fallback: number,
  bounds: { min: number; max?: number },
): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < bounds.min || (bounds.max !== undefined && parsed > bounds.max)) {
    return fallback;
  }
  return parsed;
}

/** Normalizes directory URL enums and pagination while retaining supported filters. */
export function parseEmployeeQuery(search: SearchParamsReader): EmployeeQuery {
  return {
    q: optionalValue(search, 'q'),
    country: optionalValue(search, 'country'),
    department: optionalValue(search, 'department'),
    jobRole: optionalValue(search, 'jobRole'),
    employmentType: allowedValue(search.get('employmentType'), EMPLOYMENT_TYPES),
    status: allowedValue(search.get('status'), employeeStatuses) ?? 'ACTIVE',
    page: positiveInteger(search.get('page'), 1, { min: 1 }),
    pageSize: positiveInteger(search.get('pageSize'), 25, { min: 10, max: 100 }),
    sortBy: allowedValue(search.get('sortBy'), employeeSorts) ?? 'name',
    sortOrder: search.get('sortOrder') === 'desc' ? 'desc' : 'asc',
  };
}

/** Normalizes report URL enums while retaining supported employee filters. */
export function parseInsightsQuery(search: SearchParamsReader): InsightsQuery {
  return {
    q: optionalValue(search, 'q'),
    country: optionalValue(search, 'country'),
    department: optionalValue(search, 'department'),
    jobRole: optionalValue(search, 'jobRole'),
    employmentType: allowedValue(search.get('employmentType'), EMPLOYMENT_TYPES),
    status: allowedValue(search.get('status'), employeeStatuses) ?? 'ACTIVE',
    currencyMode: search.get('currencyMode') === 'USD' ? 'USD' : 'NATIVE',
    groupBy: allowedValue(search.get('groupBy'), groupings) ?? 'country',
  };
}
