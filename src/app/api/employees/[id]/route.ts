import { route, mutationBody, requireHrSession } from '@/server/http';
import { getEmployee, updateEmployee } from '@/server/services/employees';
import { normalizeEmployeeUpdate } from '@/shared/validation';

type RouteContext = { params: Promise<{ id: string }> };

export const GET = route(async (request: Request, context: RouteContext) => {
  await requireHrSession(request);
  const { id } = await context.params;
  return Response.json({ data: await getEmployee(id) });
});

export const PATCH = route(async (request: Request, context: RouteContext) => {
  const { body } = await mutationBody(request);
  const { id } = await context.params;
  return Response.json({ data: await updateEmployee(id, normalizeEmployeeUpdate(body)) });
});
