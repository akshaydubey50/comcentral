import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

type Context = { requestId: string; method: string; route: string; entryPoint: 'http' | 'auth_setup' };
type AuthEvent = 'auth_internal_error' | 'auth_warning';
const context = new AsyncLocalStorage<Context>();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const methods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);
const paths = new Set([
  '/api/session', '/api/options', '/api/employees', '/api/employees/export', '/api/insights',
  '/api/imports/template', '/api/imports/preview', '/api/imports/commit', '/api/fx/refresh',
  '/api/cron/fx', '/api/ready',
]);

/** Route templates exclude employee IDs, unknown path segments and query values. */
function routeName(request?: Request): string {
  if (!request) return 'unknown';
  const path = new URL(request.url).pathname;
  if (paths.has(path)) return path;
  if (path.startsWith('/api/auth/')) return '/api/auth/[...all]';
  const employee = /^\/api\/employees\/[^/]+(?:\/(archive|history|salary))?$/.exec(path);
  return employee ? `/api/employees/[id]${employee[1] ? '/' + employee[1] : ''}` : 'unknown';
}

/** Only fixed operational fields reach stdout; logging must never change a response. */
function emit(event: 'http_request' | AuthEvent, details: Context, status?: number, durationMs?: number): void {
  try {
    const line = JSON.stringify({
      timestamp: new Date().toISOString(), event, entryPoint: details.entryPoint,
      requestId: details.requestId, method: details.method, route: details.route,
      ...(status === undefined ? {} : { status, durationMs }),
    });
    if (event === 'auth_internal_error' || (status ?? 0) >= 500) console.error(line);
    else if (event === 'auth_warning' || (status ?? 0) >= 400) console.warn(line);
    else console.info(line);
  } catch {
    // A broken output transport is not an application request failure.
  }
}

export function logAuthEvent(event: AuthEvent): void {
  emit(event, context.getStore() ?? {
    requestId: randomUUID(), method: 'NONE', route: 'auth_setup', entryPoint: 'auth_setup',
  });
}

/** Correlate one normalized HTTP result without inspecting its body or credentials. */
export async function withRequestLog(request: Request | undefined, handler: () => Promise<Response>): Promise<Response> {
  const supplied = request?.headers.get('x-request-id');
  const details: Context = {
    requestId: supplied && uuid.test(supplied) ? supplied.toLowerCase() : randomUUID(),
    method: request && methods.has(request.method) ? request.method : 'OTHER',
    route: routeName(request), entryPoint: 'http',
  };
  return context.run(details, async () => {
    const started = performance.now();
    const result = await handler();
    const headers = new Headers(result.headers);
    headers.set('x-request-id', details.requestId);
    if (!headers.has('cache-control')) headers.set('cache-control', 'no-store');
    if (!headers.has('x-content-type-options')) headers.set('x-content-type-options', 'nosniff');
    const response = new Response(result.body, { status: result.status, statusText: result.statusText, headers });
    emit('http_request', details, response.status, Math.round((performance.now() - started) * 100) / 100);
    return response;
  });
}
