import { route, mutationBody, requireHrSession } from '@/server/http';
import { createEmployee, listEmployees } from '@/server/services/employees';
import { normalizeEmployeeInput, parseEmployeeQuery } from '@/shared/validation';

export const GET = route(async (request: Request) => {
  await requireHrSession(request);
  const query = parseEmployeeQuery(new URL(request.url).searchParams);
  return Response.json(await listEmployees(query));
});

export const POST = route(async (request: Request) => {
  const { body } = await mutationBody(request);
  const input = normalizeEmployeeInput(body);
  return Response.json({ data: await createEmployee(input) }, { status: 201 });
});
