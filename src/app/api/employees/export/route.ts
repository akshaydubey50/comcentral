import { route, requireHrSession } from '@/server/http';
import { exportEmployees } from '@/server/services/imports';
import { parseEmployeeFilters } from '@/shared/validation';

export const GET = route(async (request: Request) => {
  await requireHrSession(request);
  const filters = parseEmployeeFilters(new URL(request.url).searchParams);
  return new Response(await exportEmployees(filters), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="acme-employees.csv"',
      'cache-control': 'no-store',
    },
  });
});
