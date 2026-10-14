import { route, requireHrSession } from '@/server/http';
import { getInsights } from '@/server/services/insights';
import { parseInsightsQuery } from '@/shared/validation';

export const GET = route(async (request: Request) => {
  await requireHrSession(request);
  const query = parseInsightsQuery(new URL(request.url).searchParams);
  return Response.json({ data: await getInsights(query) });
});
