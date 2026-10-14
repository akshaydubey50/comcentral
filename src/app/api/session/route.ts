import { getAuth } from '@/server/auth';
import { route } from '@/server/http';

export const GET = route(async (request: Request) => {
  const session = await getAuth().api.getSession({ headers: request.headers });
  return Response.json({
    user: session
      ? { id: session.user.id, name: session.user.name, email: session.user.email }
      : null,
  });
});
