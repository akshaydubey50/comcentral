import { z } from 'zod';

import { route, mutationBody } from '@/server/http';
import { refreshFx } from '@/server/services/fx';

export const POST = route(async (request: Request) => {
  const { body } = await mutationBody(request);
  z.object({}).strict().parse(body);
  return Response.json({ data: await refreshFx() });
});
