import { getAuth } from '@/server/auth';
import { assertMutationRequest, readJson, route } from '@/server/http';
import { normalizeRegistrationBody } from '@/server/registration';

const REGISTRATION_PATH = '/api/auth/sign-up/email';
const REGISTRATION_BODY_LIMIT = 4 * 1024;

async function validatedAuthRequest(request: Request): Promise<Request> {
  if (request.method !== 'POST' || new URL(request.url).pathname !== REGISTRATION_PATH) {
    return request;
  }

  const body = normalizeRegistrationBody(await readJson(request, REGISTRATION_BODY_LIMIT));
  const headers = new Headers(request.headers);
  headers.delete('content-length');

  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify(body),
    signal: request.signal,
  });
}

async function handle(request: Request): Promise<Response> {
  return getAuth().handler(await validatedAuthRequest(request));
}

export const GET = route(handle);
export const POST = route(async (request: Request) => {
  assertMutationRequest(request);
  return handle(request);
});
