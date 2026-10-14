import { describe, expect, it } from 'vitest';

import { parseEmployeeQuery, parseInsightsQuery } from './query-state';

describe('parseEmployeeQuery', () => {
  it('normalizes malformed URL values while retaining valid filters', () => {
    const query = parseEmployeeQuery(new URLSearchParams(
      'q=Ada&page=not-a-number&pageSize=also-invalid&status=UNKNOWN&employmentType=INTERN&sortBy=other&sortOrder=desc',
    ));

    expect(query).toEqual({
      q: 'Ada',
      country: undefined,
      department: undefined,
      jobRole: undefined,
      employmentType: undefined,
      status: 'ACTIVE',
      page: 1,
      pageSize: 25,
      sortBy: 'name',
      sortOrder: 'desc',
    });
  });

  it('retains valid shareable directory state', () => {
    const query = parseEmployeeQuery(new URLSearchParams(
      'country=GB&department=Engineering&jobRole=Analyst&employmentType=CONTRACT&status=ALL&page=3&pageSize=50&sortBy=salary&sortOrder=desc',
    ));

    expect(query).toMatchObject({
      country: 'GB',
      department: 'Engineering',
      jobRole: 'Analyst',
      employmentType: 'CONTRACT',
      status: 'ALL',
      page: 3,
      pageSize: 50,
      sortBy: 'salary',
      sortOrder: 'desc',
    });
  });

  it.each(['-1', '1.5', 'Infinity', '9007199254740992'])(
    'defaults the invalid page value %s',
    (page) => {
      expect(parseEmployeeQuery(new URLSearchParams({ page })).page).toBe(1);
    },
  );

  it.each(['-25', '25.5', 'Infinity', '9007199254740992', '9', '101'])(
    'defaults the invalid page-size value %s',
    (pageSize) => {
      expect(parseEmployeeQuery(new URLSearchParams({ pageSize })).pageSize).toBe(25);
    },
  );
});

describe('parseInsightsQuery', () => {
  it('normalizes unsupported report enums to safe defaults', () => {
    expect(parseInsightsQuery(new URLSearchParams(
      'status=UNKNOWN&employmentType=INTERN&currencyMode=GBP&groupBy=tenure',
    ))).toMatchObject({
      employmentType: undefined,
      status: 'ACTIVE',
      currencyMode: 'NATIVE',
      groupBy: 'country',
    });
  });

  it('retains valid report filters and presentation state', () => {
    expect(parseInsightsQuery(new URLSearchParams(
      'q=Grace&status=ARCHIVED&employmentType=PART_TIME&currencyMode=USD&groupBy=jobRole',
    ))).toMatchObject({
      q: 'Grace',
      employmentType: 'PART_TIME',
      status: 'ARCHIVED',
      currencyMode: 'USD',
      groupBy: 'jobRole',
    });
  });
});
