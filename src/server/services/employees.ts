import type {
  Currency,
  DirectoryOptions,
  Employee,
  EmployeeFilters,
  EmployeeInput,
  EmployeePage,
  EmployeeQuery,
  EmployeeUpdate,
  HrUser,
  SalaryChangeInput,
  SalaryHistory,
} from '@/shared/contracts';
import { COUNTRY_OPTIONS, currencyPrecision } from '@/shared/validation';
import { ApiError } from '@/server/http';
import { getPrisma } from '@/server/db/prisma';
import type { Prisma } from '@/server/generated/prisma/client';
import { CURRENCIES, EMPLOYMENT_TYPES } from '@/shared/contracts';

const INITIAL_SALARY_CREATION_REASON = 'Initial salary recorded at employee creation';

type EmployeeRecord = {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  country: string;
  department: string;
  jobRole: string;
  employmentType: string;
  joiningDate: Date;
  salary: { toFixed: (places: number) => string } | null;
  currency: string;
  status: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeEmployee(record: EmployeeRecord): Employee {
  const currency = record.currency as Currency;
  return {
    id: record.id,
    employeeCode: record.employeeCode,
    name: record.name,
    email: record.email,
    country: record.country,
    department: record.department,
    jobRole: record.jobRole,
    employmentType: record.employmentType as Employee['employmentType'],
    joiningDate: record.joiningDate.toISOString().slice(0, 10),
    salary: record.salary?.toFixed(currencyPrecision(currency)) ?? null,
    currency,
    status: record.status as Employee['status'],
    version: record.version,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function employeeWhere(filters: EmployeeFilters): Prisma.EmployeeWhereInput {
  const where: Prisma.EmployeeWhereInput = {};
  if (filters.status !== 'ALL') where.status = filters.status ?? 'ACTIVE';
  if (filters.country) where.country = filters.country;
  if (filters.department) where.department = filters.department;
  if (filters.jobRole) where.jobRole = filters.jobRole;
  if (filters.employmentType) where.employmentType = filters.employmentType;
  if (filters.salaryStatus === 'PENDING') where.salary = null;
  if (filters.salaryStatus === 'RECORDED') where.salary = { not: null };
  if (filters.q) {
    where.OR = [
      { employeeCode: { contains: filters.q, mode: 'insensitive' } },
      { name: { contains: filters.q, mode: 'insensitive' } },
      { email: { contains: filters.q, mode: 'insensitive' } },
    ];
  }
  return where;
}

function translateWriteError(error: unknown): never {
  const code = (error as { code?: string }).code;
  if (code === 'P2002') {
    throw new ApiError(
      409,
      'DUPLICATE_EMPLOYEE',
      'Employee code or normalized email already exists',
    );
  }
  throw error;
}

export async function listEmployees(query: EmployeeQuery): Promise<EmployeePage> {
  const prisma = getPrisma();
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 25;
  const sortBy = query.sortBy ?? 'name';
  const sortOrder = query.sortOrder ?? 'asc';
  const where = employeeWhere(query);
  const orderBy = [
    { [sortBy]: sortOrder },
    { id: sortOrder },
  ] as Prisma.EmployeeOrderByWithRelationInput[];

  const [records, total] = await prisma.$transaction([
    prisma.employee.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ]);

  return {
    data: records.map(serializeEmployee),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    },
  };
}

export async function getEmployee(id: string): Promise<Employee> {
  const record = await getPrisma().employee.findUnique({ where: { id } });
  if (!record) throw new ApiError(404, 'EMPLOYEE_NOT_FOUND', 'Employee was not found');
  return serializeEmployee(record);
}

export async function createEmployee(input: EmployeeInput, actor: HrUser): Promise<Employee> {
  const prisma = getPrisma();
  try {
    return await prisma.$transaction(async (tx) => {
      const record = await tx.employee.create({
        data: {
          ...input,
          joiningDate: new Date(`${input.joiningDate}T00:00:00.000Z`),
        },
      });
      if (record.salary === null) {
        throw new Error('Manual employee creation requires an initial salary');
      }
      await tx.salaryHistory.create({
        data: {
          employeeId: record.id,
          previousSalary: null,
          previousCurrency: record.currency,
          salary: record.salary,
          currency: record.currency,
          reason: INITIAL_SALARY_CREATION_REASON,
          actorId: actor.id,
          actorName: actor.name,
          actorEmail: actor.email,
        },
      });
      return serializeEmployee(record);
    });
  } catch (error) {
    translateWriteError(error);
  }
}

export async function updateEmployee(id: string, input: EmployeeUpdate): Promise<Employee> {
  const prisma = getPrisma();
  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.employee.updateMany({
        where: { id, version: input.version },
        data: {
          employeeCode: input.employeeCode,
          name: input.name,
          email: input.email,
          country: input.country,
          department: input.department,
          jobRole: input.jobRole,
          employmentType: input.employmentType,
          joiningDate: new Date(`${input.joiningDate}T00:00:00.000Z`),
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) {
        const exists = await tx.employee.count({ where: { id } });
        if (!exists) throw new ApiError(404, 'EMPLOYEE_NOT_FOUND', 'Employee was not found');
        throw new ApiError(409, 'VERSION_CONFLICT', 'Employee was changed by another request');
      }
      const record = await tx.employee.findUniqueOrThrow({ where: { id } });
      return serializeEmployee(record);
    });
  } catch (error) {
    translateWriteError(error);
  }
}

export async function archiveEmployee(
  id: string,
  version: number,
  archived: boolean,
): Promise<Employee> {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const updated = await tx.employee.updateMany({
      where: { id, version },
      data: {
        status: archived ? 'ARCHIVED' : 'ACTIVE',
        version: { increment: 1 },
      },
    });
    if (updated.count === 0) {
      const exists = await tx.employee.count({ where: { id } });
      if (!exists) throw new ApiError(404, 'EMPLOYEE_NOT_FOUND', 'Employee was not found');
      throw new ApiError(409, 'VERSION_CONFLICT', 'Employee was changed by another request');
    }
    return serializeEmployee(await tx.employee.findUniqueOrThrow({ where: { id } }));
  });
}

export async function changeSalary(
  id: string,
  input: SalaryChangeInput,
  actor: HrUser,
): Promise<Employee> {
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const current = await tx.employee.findUnique({ where: { id } });
    if (!current) throw new ApiError(404, 'EMPLOYEE_NOT_FOUND', 'Employee was not found');
    if (current.status === 'ARCHIVED') {
      throw new ApiError(409, 'EMPLOYEE_ARCHIVED', 'Archived employees cannot receive salary changes');
    }
    if (current.version !== input.version) {
      throw new ApiError(409, 'VERSION_CONFLICT', 'Employee was changed by another request');
    }
    if (current.currency === input.currency && current.salary?.equals(input.salary)) {
      throw new ApiError(422, 'SALARY_UNCHANGED', 'Salary or currency must change');
    }

    const updated = await tx.employee.updateMany({
      where: { id, version: input.version, status: 'ACTIVE' },
      data: {
        salary: input.salary,
        currency: input.currency,
        version: { increment: 1 },
      },
    });
    if (updated.count === 0) {
      throw new ApiError(409, 'VERSION_CONFLICT', 'Employee was changed by another request');
    }

    await tx.salaryHistory.create({
      data: {
        employeeId: id,
        previousSalary: current.salary,
        previousCurrency: current.currency,
        salary: input.salary,
        currency: input.currency,
        reason: input.reason,
        actorId: actor.id,
        actorName: actor.name,
        actorEmail: actor.email,
      },
    });
    return serializeEmployee(await tx.employee.findUniqueOrThrow({ where: { id } }));
  });
}

export async function getSalaryHistory(id: string): Promise<SalaryHistory[]> {
  const prisma = getPrisma();
  const employeeExists = await prisma.employee.count({ where: { id } });
  if (!employeeExists) throw new ApiError(404, 'EMPLOYEE_NOT_FOUND', 'Employee was not found');

  const records = await prisma.salaryHistory.findMany({
    where: { employeeId: id },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  return records.map((record) => ({
    id: record.id,
    employeeId: record.employeeId,
    previousSalary: record.previousSalary?.toFixed(
      currencyPrecision(record.previousCurrency as Currency),
    ) ?? null,
    previousCurrency: record.previousCurrency as Currency,
    salary: record.salary.toFixed(currencyPrecision(record.currency as Currency)),
    currency: record.currency as Currency,
    reason: record.reason,
    actor: {
      id: record.actorId,
      name: record.actorName,
      email: record.actorEmail,
    },
    createdAt: record.createdAt.toISOString(),
  }));
}

export async function directoryOptions(): Promise<DirectoryOptions> {
  const prisma = getPrisma();
  const [departments, jobRoles] = await Promise.all([
    prisma.employee.findMany({
      select: { department: true },
      distinct: ['department'],
      orderBy: { department: 'asc' },
    }),
    prisma.employee.findMany({
      select: { jobRole: true },
      distinct: ['jobRole'],
      orderBy: { jobRole: 'asc' },
    }),
  ]);
  return {
    countries: COUNTRY_OPTIONS.map((country) => ({ ...country })),
    departments: departments.map((item) => item.department),
    jobRoles: jobRoles.map((item) => item.jobRole),
    employmentTypes: [...EMPLOYMENT_TYPES],
    currencies: [...CURRENCIES],
  };
}
