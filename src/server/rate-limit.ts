import { getPrisma } from '@/server/db/prisma';
import { Prisma } from '@/server/generated/prisma/client';
import { ApiError, errorResponse } from '@/server/http';

export type AuthenticatedRequestLimit = Readonly<{
  scope: string;
  limit: number;
  windowSeconds: number;
}>;

export const IMPORT_REQUEST_LIMIT = {
  scope: 'imports',
  limit: 6,
  windowSeconds: 60,
} as const satisfies AuthenticatedRequestLimit;

export const INSIGHTS_REQUEST_LIMIT = {
  scope: 'insights',
  limit: 30,
  windowSeconds: 60,
} as const satisfies AuthenticatedRequestLimit;

export const EMPLOYEE_EXPORT_REQUEST_LIMIT = {
  scope: 'employee-export',
  limit: 6,
  windowSeconds: 60,
} as const satisfies AuthenticatedRequestLimit;

export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

function authenticatedUserKey(userId: string, scope: string): string {
  return `app|user|${scope}|${userId}`;
}

/** Atomically admit one authenticated user's request using the database clock and shared store. */
export async function consumeAuthenticatedRequestLimit(
  userId: string,
  policy: AuthenticatedRequestLimit,
): Promise<RateLimitDecision> {
  const key = authenticatedUserKey(userId, policy.scope);
  const windowMs = BigInt(policy.windowSeconds * 1_000);
  const rows = await getPrisma().$queryRaw<Array<{
    count: number;
    windowStartMs: bigint;
    nowMs: bigint;
  }>>(Prisma.sql`
    WITH input AS (
      SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint AS now_ms
    ), consumed AS (
      INSERT INTO "rate_limit" ("id", "key", "count", "last_request")
      SELECT ${key}, ${key}, 1, input.now_ms
      FROM input
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "rate_limit"."last_request" <= (SELECT now_ms - ${windowMs} FROM input) THEN 1
          ELSE LEAST("rate_limit"."count" + 1, ${policy.limit + 1})
        END,
        "last_request" = CASE
          WHEN "rate_limit"."last_request" <= (SELECT now_ms - ${windowMs} FROM input)
            THEN (SELECT now_ms FROM input)
          ELSE "rate_limit"."last_request"
        END
      RETURNING "count", "last_request"
    )
    SELECT
      consumed."count"::integer AS "count",
      consumed."last_request" AS "windowStartMs",
      input.now_ms AS "nowMs"
    FROM consumed
    CROSS JOIN input
  `);
  const consumed = rows[0];
  if (!consumed) throw new Error('Rate limit consumption returned no result');
  if (consumed.count <= policy.limit) return { allowed: true };

  const remainingMs = consumed.windowStartMs + windowMs - consumed.nowMs;
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil(Number(remainingMs) / 1_000)),
  };
}

export function rateLimitedResponse(decision: Extract<RateLimitDecision, { allowed: false }>): Response {
  const response = errorResponse(
    new ApiError(429, 'RATE_LIMITED', 'Too many requests. Try again later.'),
  );
  response.headers.set('retry-after', String(decision.retryAfterSeconds));
  return response;
}
