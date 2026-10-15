import Decimal from 'decimal.js';

import type {
  Currency,
  EmploymentType,
  FxStatus,
  GroupBy,
  Insights,
  OutlierCohort,
  PayGroup,
  PayStatistics,
  PaySummary,
  SalaryBand,
  SalaryOutlier,
  TenureGroup,
} from '@/shared/contracts';
import { CURRENCIES } from '@/shared/contracts';
import { currencyPrecision } from '@/shared/validation';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

function format(value: Decimal, precision: number): string {
  return value.toDecimalPlaces(precision, Decimal.ROUND_HALF_UP).toFixed(precision);
}

export function percentile(sortedValues: readonly Decimal[], probability: number): Decimal | null {
  if (sortedValues.length === 0) return null;
  if (sortedValues.length === 1) return sortedValues[0] ?? null;

  const position = new Decimal(sortedValues.length - 1).mul(probability);
  const lowerIndex = position.floor().toNumber();
  const upperIndex = position.ceil().toNumber();
  const lower = sortedValues[lowerIndex];
  const upper = sortedValues[upperIndex];
  if (!lower || !upper) return null;
  if (lowerIndex === upperIndex) return lower;

  return lower.plus(upper.minus(lower).mul(position.minus(lowerIndex)));
}

export function statistics(values: readonly Decimal[], precision: number): PayStatistics {
  const sorted = [...values].sort((left, right) => left.comparedTo(right));
  const total = sorted.reduce((sum, value) => sum.plus(value), new Decimal(0));
  if (sorted.length === 0) {
    return {
      count: 0,
      total: format(total, precision),
      min: null,
      max: null,
      average: null,
      median: null,
      p25: null,
      p75: null,
    };
  }

  return {
    count: sorted.length,
    total: format(total, precision),
    min: format(sorted[0]!, precision),
    max: format(sorted[sorted.length - 1]!, precision),
    average: format(total.div(sorted.length), precision),
    median: format(percentile(sorted, 0.5)!, precision),
    p25: format(percentile(sorted, 0.25)!, precision),
    p75: format(percentile(sorted, 0.75)!, precision),
  };
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function completedYears(joiningDate: string, reportingDate: string): number {
  const [joiningYear, joiningMonth, joiningDay] = joiningDate.split('-').map(Number);
  const [reportingYear, reportingMonth, reportingDay] = reportingDate.split('-').map(Number);
  let anniversaryDay = joiningDay!;
  if (joiningMonth === 2 && joiningDay === 29 && !isLeapYear(reportingYear!)) {
    anniversaryDay = 28;
  }
  const anniversaryPassed =
    reportingMonth! > joiningMonth! ||
    (reportingMonth === joiningMonth && reportingDay! >= anniversaryDay);
  return reportingYear! - joiningYear! - (anniversaryPassed ? 0 : 1);
}

export function tenureBucket(years: number): string {
  if (years < 1) return '<1';
  if (years < 3) return '1–<3';
  if (years < 5) return '3–<5';
  if (years < 10) return '5–<10';
  return '10+';
}


export interface AnalyticsEmployee {
  id: string;
  employeeCode: string;
  name: string;
  country: string;
  department?: string;
  jobRole: string;
  employmentType: EmploymentType;
  joiningDate?: string;
  salary: Decimal | null;
  currency: Currency;
}

export interface FxAnalyticsContext {
  status: FxStatus;
  rates: Partial<Record<Currency, Decimal>>;
}

const BAND_BOUNDARIES: Record<Currency, readonly number[]> = {
  USD: [0, 25000, 50000, 75000, 100000, 150000, 200000],
  EUR: [0, 25000, 50000, 75000, 100000, 150000, 200000],
  GBP: [0, 25000, 50000, 75000, 100000, 150000, 200000],
  CAD: [0, 25000, 50000, 75000, 100000, 150000, 200000],
  AUD: [0, 25000, 50000, 75000, 100000, 150000, 200000],
  SGD: [0, 25000, 50000, 75000, 100000, 150000, 200000],
  INR: [0, 500000, 1000000, 1500000, 2000000, 3000000, 5000000],
  JPY: [0, 3000000, 5000000, 7000000, 10000000, 15000000, 20000000],
  BRL: [0, 25000, 50000, 75000, 100000, 150000, 200000],
};

type PaidAnalyticsEmployee = AnalyticsEmployee & { salary: Decimal };

function hasSalary(employee: AnalyticsEmployee): employee is PaidAnalyticsEmployee {
  return employee.salary !== null;
}

function cohortKey(employee: AnalyticsEmployee): string {
  return [employee.country, employee.currency, employee.jobRole, employee.employmentType].join('\u0000');
}

export function buildOutlierAnalysis(employees: readonly AnalyticsEmployee[]): Insights['outliers'] {
  const grouped = new Map<string, PaidAnalyticsEmployee[]>();
  for (const employee of employees) {
    if (!hasSalary(employee)) continue;
    const key = cohortKey(employee);
    const group = grouped.get(key);
    if (group) group.push(employee);
    else grouped.set(key, [employee]);
  }

  const cohorts: OutlierCohort[] = [];
  const flags: SalaryOutlier[] = [];
  for (const group of grouped.values()) {
    const first = group[0]!;
    const base = {
      country: first.country,
      currency: first.currency,
      jobRole: first.jobRole,
      employmentType: first.employmentType,
      count: group.length,
    };
    if (group.length < 10) {
      cohorts.push({ ...base, state: 'INSUFFICIENT_DATA' });
      continue;
    }

    const sorted = group.map((employee) => employee.salary).sort((a, b) => a.comparedTo(b));
    const q1 = percentile(sorted, 0.25)!;
    const q3 = percentile(sorted, 0.75)!;
    const iqr = q3.minus(q1);
    if (iqr.isZero()) {
      cohorts.push({ ...base, state: 'ZERO_IQR' });
      continue;
    }
    cohorts.push({ ...base, state: 'EVALUATED' });
    const lowerFence = q1.minus(iqr.mul('1.5'));
    const upperFence = q3.plus(iqr.mul('1.5'));
    for (const employee of group) {
      const direction =
        employee.salary.lt(lowerFence) ? 'LOW' : employee.salary.gt(upperFence) ? 'HIGH' : null;
      if (!direction) continue;
      const precision = currencyPrecision(employee.currency);
      flags.push({
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        name: employee.name,
        country: employee.country,
        currency: employee.currency,
        jobRole: employee.jobRole,
        employmentType: employee.employmentType,
        salary: format(employee.salary, precision),
        groupSize: group.length,
        lowerFence: format(lowerFence, precision),
        upperFence: format(upperFence, precision),
        direction,
      });
    }
  }

  flags.sort((left, right) => left.employeeCode.localeCompare(right.employeeCode));
  cohorts.sort((left, right) =>
    [left.country, left.currency, left.jobRole, left.employmentType]
      .join('|')
      .localeCompare([right.country, right.currency, right.jobRole, right.employmentType].join('|')),
  );
  return {
    data: flags.slice(0, 100),
    total: flags.length,
    cohorts,
    minimumGroupSize: 10,
  };
}

type ReportingRow = { employee: AnalyticsEmployee; currency: Currency; salary: Decimal };

function summaryFor(currency: Currency, values: readonly Decimal[]): PaySummary {
  return { ...statistics(values, currencyPrecision(currency)), currency };
}

function buildSummaries(rows: readonly ReportingRow[]): PaySummary[] {
  return CURRENCIES.flatMap((currency) => {
    const values = rows.filter((row) => row.currency === currency).map((row) => row.salary);
    return values.length ? [summaryFor(currency, values)] : [];
  });
}

function groupLabel(employee: AnalyticsEmployee, groupBy: GroupBy): string {
  return groupBy === 'country'
    ? employee.country
    : groupBy === 'department'
      ? employee.department ?? ''
      : employee.jobRole;
}

function buildGroups(rows: readonly ReportingRow[], groupBy: GroupBy): PayGroup[] {
  const groups = new Map<string, ReportingRow[]>();
  for (const row of rows) {
    const label = groupLabel(row.employee, groupBy);
    const key = label + '\u0000' + row.currency;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return [...groups.values()]
    .map((group) => {
      const first = group[0]!;
      return {
        label: groupLabel(first.employee, groupBy),
        ...summaryFor(first.currency, group.map((row) => row.salary)),
      };
    })
    .sort((left, right) =>
      (left.label + '|' + left.currency).localeCompare(right.label + '|' + right.currency),
    );
}

function buildBands(rows: readonly ReportingRow[]): SalaryBand[] {
  return CURRENCIES.flatMap((currency) => {
    const currencyRows = rows.filter((row) => row.currency === currency);
    if (currencyRows.length === 0) return [];
    const boundaries = BAND_BOUNDARIES[currency];
    const precision = currencyPrecision(currency);
    return boundaries.map((lower, index) => {
      const upper = boundaries[index + 1];
      const lowerDecimal = new Decimal(lower);
      const upperDecimal = upper === undefined ? null : new Decimal(upper);
      const count = currencyRows.filter(
        (row) =>
          row.salary.gte(lowerDecimal) && (upperDecimal === null || row.salary.lt(upperDecimal)),
      ).length;
      return {
        currency,
        label:
          upper === undefined
            ? format(lowerDecimal, precision) + '+'
            : format(lowerDecimal, precision) + '–<' + format(upperDecimal!, precision),
        lower: format(lowerDecimal, precision),
        upper: upperDecimal === null ? null : format(upperDecimal, precision),
        count,
      };
    });
  });
}

const TENURE_BUCKETS = ['<1', '1–<3', '3–<5', '5–<10', '10+'] as const;

function buildTenure(rows: readonly ReportingRow[], asOf: string): TenureGroup[] {
  const groups = new Map<string, ReportingRow[]>();
  for (const row of rows) {
    if (!row.employee.joiningDate) continue;
    const bucket = tenureBucket(completedYears(row.employee.joiningDate, asOf));
    const key = bucket + '\u0000' + row.currency;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return CURRENCIES.flatMap((currency) =>
    TENURE_BUCKETS.flatMap((bucket) => {
      const group = groups.get(bucket + '\u0000' + currency);
      return group
        ? [{ bucket, ...summaryFor(currency, group.map((row) => row.salary)) }]
        : [];
    }),
  );
}

export function buildInsights(
  employees: readonly AnalyticsEmployee[],
  currencyMode: 'NATIVE' | 'USD',
  groupBy: GroupBy,
  asOf: string,
  fx: FxAnalyticsContext,
): Insights {
  const outliers = buildOutlierAnalysis(employees);
  const paidEmployees = employees.filter(hasSalary);
  let rows: ReportingRow[] = paidEmployees.map((employee) => ({
    employee,
    currency: employee.currency,
    salary: employee.salary,
  }));
  let reportingAvailable = true;

  if (currencyMode === 'USD') {
    reportingAvailable = fx.status.available;
    if (reportingAvailable) {
      const converted: ReportingRow[] = [];
      for (const employee of paidEmployees) {
        const rate = fx.rates[employee.currency];
        if (!rate) {
          reportingAvailable = false;
          break;
        }
        converted.push({ employee, currency: 'USD', salary: employee.salary.mul(rate) });
      }
      rows = reportingAvailable ? converted : [];
    } else {
      rows = [];
    }
  }

  return {
    headcount: employees.length,
    salaryPendingCount: employees.length - paidEmployees.length,
    asOf,
    currencyMode,
    groupBy,
    summaries: buildSummaries(rows),
    groups: buildGroups(rows, groupBy),
    bands: buildBands(rows),
    tenure: buildTenure(rows, asOf),
    outliers,
    fx: fx.status,
    reportingAvailable,
  };
}
