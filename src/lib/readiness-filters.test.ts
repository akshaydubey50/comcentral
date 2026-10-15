import { describe, expect, it } from 'vitest';

import { parseEmployeeQuery, parseInsightsQuery } from './query-state';
import { parseEmployeeFilters } from '@/shared/validation';
import { employeeWhere } from '@/server/services/employees';

describe('salary readiness filters', () => {
  it.each(['PENDING', 'RECORDED'] as const)('retains %s across directory, reporting and export boundaries', (salaryStatus) => {
    const params = new URLSearchParams({ salaryStatus, country: 'BR', status: 'ALL', q: 'Ada' });
    for (const query of [parseEmployeeQuery(params), parseInsightsQuery(params), parseEmployeeFilters(params)]) {
      expect(query).toMatchObject({ salaryStatus, country: 'BR', status: 'ALL', q: 'Ada' });
    }
    const where = employeeWhere(parseEmployeeFilters(params));
    expect(where).toMatchObject({ country: 'BR', salary: salaryStatus === 'PENDING' ? null : { not: null } });
    expect(where).not.toHaveProperty('status');
    expect(where.OR).toHaveLength(3);
  });

  it('normalizes unsupported browser values and rejects unsupported API values', () => {
    const params = new URLSearchParams('salaryStatus=ZERO');
    expect(parseEmployeeQuery(params)).not.toHaveProperty('salaryStatus');
    expect(parseInsightsQuery(params)).not.toHaveProperty('salaryStatus');
    expect(() => parseEmployeeFilters(params)).toThrow();
  });

  it('keeps the default population inclusive of pending and recorded salaries', () => {
    expect(employeeWhere(parseEmployeeFilters(new URLSearchParams()))).toEqual({ status: 'ACTIVE' });
  });
});
