import { route, mutationBody } from '@/server/http';
import { archiveEmployee } from '@/server/services/employees';
import { archiveInputSchema } from '@/shared/validation';

type RouteContext = { params: Promise<{ id: string }> };

export const POST = route(async (request: Request, context: RouteContext) => {
  const { body } = await mutationBody(request);
  const input = archiveInputSchema.parse(body);
  const { id } = await context.params;
  return Response.json({
    data: await archiveEmployee(id, input.version, input.archived),
  });
});
