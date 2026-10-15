import { route } from '@/server/http';
import { checkReadiness } from '@/server/readiness';

export const GET = route<[Request]>(async () => {
  const result = await checkReadiness();
  return Response.json(
    { status: result.status },
    { status: result.status === 'ready' ? 200 : 503 },
  );
});
