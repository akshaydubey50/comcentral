import { route, mutationBody } from '@/server/http';
import { commitImport } from '@/server/services/imports';
import {
  importCommitBodySchema,
  MAX_IMPORT_REQUEST_BYTES,
} from '@/shared/validation';

export const POST = route(async (request: Request) => {
  const { body } = await mutationBody(request, MAX_IMPORT_REQUEST_BYTES);
  const input = importCommitBodySchema.parse(body);
  return Response.json(
    { data: await commitImport(input.csvText, input.previewHash) },
    { status: 201 },
  );
});
