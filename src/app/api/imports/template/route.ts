import { EMPLOYEE_CSV_HEADERS, toCsv } from '@/server/domain/csv';
import { route, requireHrSession } from '@/server/http';

export const GET = route(async (request: Request) => {
  await requireHrSession(request);
  return new Response(toCsv([EMPLOYEE_CSV_HEADERS]), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="acme-employee-import-template.csv"',
      'cache-control': 'no-store',
    },
  });
});
