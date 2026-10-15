import { route, requireHrSession } from '@/server/http';
import {
  consumeAuthenticatedRequestLimit,
  EMPLOYEE_EXPORT_REQUEST_LIMIT,
  rateLimitedResponse,
} from '@/server/rate-limit';
import { exportEmployees } from '@/server/services/imports';
import { parseEmployeeFilters } from '@/shared/validation';

export const GET = route(async (request: Request) => {
  const actor = await requireHrSession(request);
  const admission = await consumeAuthenticatedRequestLimit(actor.id, EMPLOYEE_EXPORT_REQUEST_LIMIT);
  if (!admission.allowed) return rateLimitedResponse(admission);
  const filters = parseEmployeeFilters(new URL(request.url).searchParams);
  return new Response(await exportEmployees(filters), {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="acme-employees.csv"',
      'cache-control': 'no-store',
    },
  });
});
