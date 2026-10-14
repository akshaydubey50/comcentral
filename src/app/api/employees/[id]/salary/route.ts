import { route, mutationBody } from '@/server/http';
import { changeSalary } from '@/server/services/employees';
import { normalizeSalaryChange } from '@/shared/validation';

type RouteContext = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, context: RouteContext) => {
  const { actor, body } = await mutationBody(request);
  const { id } = await context.params;
  return Response.json({
    data: await changeSalary(id, normalizeSalaryChange(body), actor),
  });
});
