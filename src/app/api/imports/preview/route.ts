import { route, mutationBody } from '@/server/http';
import { previewImport } from '@/server/services/imports';
import {
  importPreviewBodySchema,
  MAX_IMPORT_REQUEST_BYTES,
} from '@/shared/validation';

export const POST = route(async (request: Request) => {
  const { body } = await mutationBody(request, MAX_IMPORT_REQUEST_BYTES);
  const input = importPreviewBodySchema.parse(body);
  return Response.json({ data: await previewImport(input.csvText) });
});
