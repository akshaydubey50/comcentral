import { route, requireHrSession } from '@/server/http';
import { getSalaryHistory } from '@/server/services/employees';

type RouteContext = { params: Promise<{ id: string }> };

export const GET = route(async (request: Request, context: RouteContext) => {
  await requireHrSession(request);
  const { id } = await context.params;
  return Response.json({ data: await getSalaryHistory(id) });
});
