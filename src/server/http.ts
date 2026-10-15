import { ZodError } from 'zod';

import type { ApiErrorBody, HrUser } from '@/shared/contracts';
import { InputValidationError } from '@/shared/validation';
import { getAuth } from '@/server/auth';
import { applicationOrigin, ConfigurationError } from '@/server/config';
import { withRequestLog } from '@/server/request-logging';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorResponse(error: ApiError): Response {
  const body: ApiErrorBody = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    },
  };
  return Response.json(body, {
    status: error.status,
    headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
  });
}

function normalizedZodDetails(error: ZodError): Array<{ field: string; message: string }> {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'request',
    message: issue.message,
  }));
}

export function route<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>,
): (...args: T) => Promise<Response> {
  return (...args: T) => withRequestLog(args[0] instanceof Request ? args[0] : undefined, async () => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ApiError) return errorResponse(error);
      if (error instanceof InputValidationError) {
        return errorResponse(new ApiError(422, 'VALIDATION_ERROR', error.message, error.details));
      }
      if (error instanceof ZodError) {
        return errorResponse(
          new ApiError(422, 'VALIDATION_ERROR', 'Request validation failed', normalizedZodDetails(error)),
        );
      }
      if (error instanceof ConfigurationError) {
        return errorResponse(
          new ApiError(503, 'SERVICE_UNAVAILABLE', 'Service configuration is unavailable'),
        );
      }
      const databaseCode =
        (error as { code?: string; cause?: { code?: string } })?.code ??
        (error as { cause?: { code?: string } })?.cause?.code;
      if (
        ['P1001', 'P1002', 'P1003', 'P2024', 'ECONNREFUSED', 'ETIMEDOUT'].includes(
          databaseCode ?? '',
        )
      ) {
        return errorResponse(
          new ApiError(503, 'SERVICE_UNAVAILABLE', 'Database service is unavailable'),
        );
      }

      return errorResponse(new ApiError(500, 'INTERNAL_ERROR', 'The request could not be completed'));
    }
  });
}

export async function requireHrSession(request: Request): Promise<HrUser> {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) throw new ApiError(401, 'UNAUTHORIZED', 'A valid HR session is required');
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
}

export function assertMutationRequest(request: Request): void {
  const mediaType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
  if (mediaType !== 'application/json') {
    throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Mutations require application/json');
  }

  const origin = request.headers.get('origin');
  let expectedOrigin: string;
  try {
    expectedOrigin = applicationOrigin();
  } catch (error) {
    if (error instanceof ConfigurationError) throw error;
    throw new ConfigurationError('BETTER_AUTH_URL is invalid');
  }
  if (!origin || origin !== expectedOrigin || origin !== new URL(request.url).origin) {
    throw new ApiError(403, 'ORIGIN_REJECTED', 'Request origin is not allowed');
  }
}

export async function readJson(request: Request, maxBytes = 64 * 1024): Promise<unknown> {
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request payload is too large');
  }

  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON');
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Request payload is too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON');
  }
}

export async function mutationBody(
  request: Request,
  maxBytes?: number,
): Promise<{ actor: HrUser; body: unknown }> {
  assertMutationRequest(request);
  const actor = await requireHrSession(request);
  const body = await readJson(request, maxBytes);
  return { actor, body };
}
