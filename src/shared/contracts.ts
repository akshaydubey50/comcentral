/** API money uses exact decimal strings; null means a salary has not been supplied. */
export const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'SGD', 'BRL'] as const;
export type Currency = typeof CURRENCIES[number];
export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'] as const;
export type EmploymentType = typeof EMPLOYMENT_TYPES[number];
export type EmployeeStatus = 'ACTIVE' | 'ARCHIVED';
export type SalaryStatus = 'PENDING' | 'RECORDED';
export interface HrUser { id: string; name: string; email: string }
export interface EmployeeInput {
  employeeCode: string; name: string; email: string; country: string;
  department: string; jobRole: string; employmentType: EmploymentType;
  joiningDate: string; salary: string; currency: Currency;
}
/** Imported employee details may await an explicit first salary assignment. */
export interface EmployeeImportInput extends Omit<EmployeeInput, 'salary'> { salary: string | null }
export interface Employee extends EmployeeImportInput {
  id: string; status: EmployeeStatus; version: number; createdAt: string; updatedAt: string;
}
export type EmployeeUpdate = Omit<EmployeeInput, 'salary' | 'currency'> & { version: number };
export interface SalaryChangeInput { salary: string; currency: Currency; reason: string; version: number }
export interface SalaryHistory {
  id: string; employeeId: string; previousSalary: string | null; previousCurrency: Currency;
  salary: string; currency: Currency; reason: string; actor: HrUser; createdAt: string;
}
export interface EmployeeFilters {
  q?: string; country?: string; department?: string; jobRole?: string;
  employmentType?: EmploymentType; status?: EmployeeStatus | 'ALL';
  /** Omitted includes all salaries; pending means null, never zero. */
  salaryStatus?: SalaryStatus;
}
export type EmployeeSort = 'name' | 'employeeCode' | 'joiningDate' | 'salary' | 'updatedAt';
export interface EmployeeQuery extends EmployeeFilters {
  page?: number; pageSize?: number; sortBy?: EmployeeSort; sortOrder?: 'asc' | 'desc';
}
export interface EmployeePage {
  data: Employee[]; pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
export interface DirectoryOptions {
  countries: { code: string; name: string; currency: Currency }[];
  departments: string[]; jobRoles: string[]; employmentTypes: EmploymentType[]; currencies: Currency[];
}
export interface ApiErrorBody { error: { code: string; message: string; details?: unknown } }
export interface ImportError { row: number; field: string; message: string }
export interface ImportPreview {
  valid: boolean; totalRows: number; salaryPendingCount: number; preview: EmployeeImportInput[]; errors: ImportError[];
  errorCount: number; previewHash: string;
}
export interface ImportResult { imported: number }
export type CurrencyMode = 'NATIVE' | 'USD';
export type GroupBy = 'country' | 'department' | 'jobRole';
export interface InsightsQuery extends EmployeeFilters { currencyMode?: CurrencyMode; groupBy?: GroupBy }
export interface PayStatistics {
  count: number; total: string; min: string | null; max: string | null; average: string | null;
  median: string | null; p25: string | null; p75: string | null;
}
export interface PaySummary extends PayStatistics { currency: Currency }
export interface PayGroup extends PaySummary { label: string }
export interface SalaryBand { currency: Currency; label: string; lower: string; upper: string | null; count: number }
export interface TenureGroup extends PaySummary { bucket: string }
export interface SalaryOutlier {
  employeeId: string; employeeCode: string; name: string; country: string; currency: Currency;
  jobRole: string; employmentType: EmploymentType; salary: string; groupSize: number;
  lowerFence: string; upperFence: string; direction: 'LOW' | 'HIGH';
}
export interface OutlierCohort {
  country: string; currency: Currency; jobRole: string; employmentType: EmploymentType;
  count: number; state: 'EVALUATED' | 'INSUFFICIENT_DATA' | 'ZERO_IQR';
}
export interface FxStatus {
  available: boolean; state: 'FRESH' | 'CACHED' | 'STALE' | 'MISSING';
  provider: string; snapshotId: string | null; rateDate: string | null;
  fetchedAt: string | null; lastAttemptAt: string | null; message: string;
}
export interface Insights {
  headcount: number; salaryPendingCount: number; asOf: string; currencyMode: CurrencyMode; groupBy: GroupBy;
  summaries: PaySummary[]; groups: PayGroup[]; bands: SalaryBand[]; tenure: TenureGroup[];
  outliers: { data: SalaryOutlier[]; total: number; cohorts: OutlierCohort[]; minimumGroupSize: number };
  fx: FxStatus; reportingAvailable: boolean;
}
