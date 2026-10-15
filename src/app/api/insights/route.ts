import { route, requireHrSession } from '@/server/http';
import {
  consumeAuthenticatedRequestLimit,
  INSIGHTS_REQUEST_LIMIT,
  rateLimitedResponse,
} from '@/server/rate-limit';
import { getInsights } from '@/server/services/insights';
import { parseInsightsQuery } from '@/shared/validation';

export const GET = route(async (request: Request) => {
  const actor = await requireHrSession(request);
  const admission = await consumeAuthenticatedRequestLimit(actor.id, INSIGHTS_REQUEST_LIMIT);
  if (!admission.allowed) return rateLimitedResponse(admission);
  const query = parseInsightsQuery(new URL(request.url).searchParams);
  return Response.json({ data: await getInsights(query) });
});
