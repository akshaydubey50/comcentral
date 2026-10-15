import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

/** Give each document its own script/style nonce before Next renders the HTML. */
export function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString('base64');
  const development = process.env.NODE_ENV === 'development';
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    // Next DevTools injects unnonced styles; production keeps nonce-only elements.
    `style-src 'self' ${development ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    // MUI positioning/transitions and React style props require style attributes.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:", "font-src 'self'", "object-src 'none'",
    `connect-src 'self'${development ? ' ws: wss:' : ''}`,
    "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'",
    ...(request.nextUrl.protocol === 'https:' ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', policy);
  return response;
}

export const config = {
  matcher: ['/((?!api(?:/|$)|_next/static|_next/image|favicon.ico).*)'],
};
