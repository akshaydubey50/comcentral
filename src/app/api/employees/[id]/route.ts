import { route, mutationBody, requireHrSession } from '@/server/http';
import { archiveEmployee, getEmployee, updateEmployee } from '@/server/services/employees';
import { archiveInputSchema, normalizeEmployeeUpdate } from '@/shared/validation';

type RouteContext = { params: Promise<{ id: string }> };
const deleteEmployeeSchema = archiveInputSchema.pick({ version: true });

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

export const DELETE = route(async (request: Request, context: RouteContext) => {
  const { body } = await mutationBody(request);
  const input = deleteEmployeeSchema.parse(body);
  const { id } = await context.params;
  return Response.json({ data: await archiveEmployee(id, input.version, true) });
});
