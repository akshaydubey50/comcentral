import type { Currency, EmployeeInput, EmploymentType } from '@/shared/contracts';

const countries = [
  ['AU', 'AUD'],
  ['CA', 'CAD'],
  ['DE', 'EUR'],
  ['GB', 'GBP'],
  ['IN', 'INR'],
  ['JP', 'JPY'],
  ['SG', 'SGD'],
  ['US', 'USD'],
] as const satisfies ReadonlyArray<readonly [string, Currency]>;
const departments = ['Engineering', 'Finance', 'Human Resources', 'Operations', 'Sales'];
const roles = ['Analyst', 'Manager', 'Principal', 'Senior Specialist', 'Specialist'];
const employmentTypes: EmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CONTRACT'];

function pseudoRandom(index: number, salt: number): number {
  let state = (index + 1) * 1664525 + salt * 1013904223;
  state ^= state >>> 16;
  return Math.abs(state % 1_000_000) / 1_000_000;
}

export function buildSeedEmployee(index: number): EmployeeInput {
  if (!Number.isInteger(index) || index < 0 || index >= 10_000) {
    throw new RangeError('Seed employee index must be between 0 and 9999');
  }
  const [country, currency] = countries[index % countries.length]!;
  const dayOffset = Math.floor(pseudoRandom(index, 1) * 5_800);
  const joiningDate = new Date(Date.UTC(2010, 0, 1 + dayOffset)).toISOString().slice(0, 10);
  const baseByCurrency: Record<Currency, number> = {
    USD: 45_000,
    INR: 600_000,
    EUR: 42_000,
    GBP: 38_000,
    JPY: 4_500_000,
    CAD: 55_000,
    AUD: 62_000,
    SGD: 58_000,
  };
  const base = baseByCurrency[currency];
  const variable = Math.floor(pseudoRandom(index, 2) * base * 3);
  const salary =
    currency === 'JPY' ? String(base + variable) : (base + variable + (index % 100) / 100).toFixed(2);
  const sequence = String(index + 1).padStart(5, '0');

  return {
    employeeCode: 'SEED-' + sequence,
    name: 'Employee ' + sequence,
    email: 'employee.' + sequence + '@example.invalid',
    country,
    department: departments[index % departments.length]!,
    jobRole: roles[Math.floor(index / departments.length) % roles.length]!,
    employmentType: employmentTypes[index % employmentTypes.length]!,
    joiningDate,
    salary,
    currency,
  };
}
