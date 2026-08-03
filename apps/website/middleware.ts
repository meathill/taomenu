import { resolveUiLocale } from '@taomenu/shared';
import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

const LOCALE_COOKIE = 'NEXT_LOCALE';

function readCountry(request: NextRequest): string | null {
  const cfCountry = (request as NextRequest & { cf?: { country?: string } }).cf?.country;
  if (cfCountry) {
    return cfCountry;
  }
  return request.headers.get('cf-ipcountry') || request.headers.get('CF-IPCountry');
}

/**
 * 语言协商优先级：
 * 1. 路径已带 /en|zh|ja|vi → next-intl
 * 2. NEXT_LOCALE cookie
 * 3. Accept-Language 命中支持语言
 * 4. IP 国家（Cloudflare CF-IPCountry / request.cf.country）
 * 5. 默认 en
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathHasLocale = routing.locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (pathHasLocale) {
    return intlMiddleware(request);
  }

  const resolved = resolveUiLocale({
    preferred: request.cookies.get(LOCALE_COOKIE)?.value,
    acceptLanguage: request.headers.get('accept-language'),
    country: readCountry(request),
  });

  const url = request.nextUrl.clone();
  url.pathname = pathname === '/' ? `/${resolved}` : `/${resolved}${pathname}`;

  const response = NextResponse.redirect(url);
  response.cookies.set(LOCALE_COOKIE, resolved, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return response;
}

export const config = {
  matcher: ['/', '/(en|zh|ja|vi)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
