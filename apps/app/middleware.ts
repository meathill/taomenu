import { type NextRequest, NextResponse } from 'next/server';

/** Better Auth session cookie 前缀；未登录访问 /app 时跳登录。 */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (cookie) => cookie.name.includes('session_token') || cookie.name.includes('session-token'),
    );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/app') ||
    pathname === '/terminal' ||
    pathname.startsWith('/terminal/')
  ) {
    if (!hasSessionCookie(request)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/terminal', '/terminal/:path*'],
};
