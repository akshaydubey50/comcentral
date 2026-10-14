import { getAuth } from '@/server/auth';
import { assertMutationRequest, route } from '@/server/http';

async function handle(request: Request): Promise<Response> {
  return getAuth().handler(request);
}

export const GET = route(handle);
export const POST = route(async (request: Request) => {
  assertMutationRequest(request);
  return handle(request);
});
