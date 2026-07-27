import { type NextRequest, NextResponse } from 'next/server';
import { hasDevSession } from './lib/auth-stub';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/app')) {
    if (!hasDevSession(request.headers.get('cookie'))) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*'],
};
