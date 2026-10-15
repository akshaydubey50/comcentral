import Decimal from 'decimal.js';

import type { Insights, InsightsQuery } from '@/shared/contracts';
import { buildInsights } from '@/server/domain/analytics';
import { getPrisma } from '@/server/db/prisma';
import { getFxContext } from '@/server/services/fx';
import { employeeWhere } from '@/server/services/employees';

export async function getInsights(query: InsightsQuery, now = new Date()): Promise<Insights> {
  const records = await getPrisma().employee.findMany({
    where: employeeWhere(query),
    select: {
      id: true,
      employeeCode: true,
      name: true,
      country: true,
      department: true,
      jobRole: true,
      employmentType: true,
      joiningDate: true,
      salary: true,
      currency: true,
    },
    orderBy: { id: 'asc' },
  });
  const fx = await getFxContext(now);
  const asOf = now.toISOString().slice(0, 10);
  return buildInsights(
    records.map((record) => ({
      id: record.id,
      employeeCode: record.employeeCode,
      name: record.name,
      country: record.country,
      department: record.department,
      jobRole: record.jobRole,
      employmentType: record.employmentType,
      joiningDate: record.joiningDate.toISOString().slice(0, 10),
      salary: record.salary === null ? null : new Decimal(record.salary.toString()),
      currency: record.currency,
    })),
    query.currencyMode ?? 'NATIVE',
    query.groupBy ?? 'country',
    asOf,
    fx,
  );
}
