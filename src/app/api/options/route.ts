import { route, requireHrSession } from '@/server/http';
import { directoryOptions } from '@/server/services/employees';

export const GET = route(async (request: Request) => {
  await requireHrSession(request);
  return Response.json({ data: await directoryOptions() });
});
