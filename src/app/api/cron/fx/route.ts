import { timingSafeEqual } from 'node:crypto';

import { requireEnvironment } from '@/server/config';
import { ApiError, route } from '@/server/http';
import { refreshFx } from '@/server/services/fx';

function sameSecret(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export const GET = route(async (request: Request) => {
  const configured = requireEnvironment('CRON_SECRET');
  const authorization = request.headers.get('authorization');
  const supplied = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!supplied || !sameSecret(configured, supplied)) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Valid cron authorization is required');
  }
  return Response.json({ data: await refreshFx() });
});
