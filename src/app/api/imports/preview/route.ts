import { assertMutationRequest, readJson, requireHrSession, route } from '@/server/http';
import {
  consumeAuthenticatedRequestLimit,
  IMPORT_REQUEST_LIMIT,
  rateLimitedResponse,
} from '@/server/rate-limit';
import { previewImport } from '@/server/services/imports';
import {
  importPreviewBodySchema,
  MAX_IMPORT_REQUEST_BYTES,
} from '@/shared/validation';

export const POST = route(async (request: Request) => {
  assertMutationRequest(request);
  const actor = await requireHrSession(request);
  const admission = await consumeAuthenticatedRequestLimit(actor.id, IMPORT_REQUEST_LIMIT);
  if (!admission.allowed) return rateLimitedResponse(admission);
  const body = await readJson(request, MAX_IMPORT_REQUEST_BYTES);
  const input = importPreviewBodySchema.parse(body);
  return Response.json({ data: await previewImport(input.csvText) });
});
