import { resolveUiLocale } from '@taomenu/shared';
import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

const LOCALE_COOKIE = 'NEXT_LOCALE';

/** Better Auth session cookie：含 plain / __Secure- / __Host- 前缀变体 */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => {
    const name = cookie.name.toLowerCase();
    return (
      name.includes('session_token') ||
      name.includes('session-token') ||
      name.endsWith('session_token') ||
      (name.includes('better-auth') && name.includes('session') && Boolean(cookie.value))
    );
  });
}

function readCountry(request: NextRequest): string | null {
  const cfCountry = (request as NextRequest & { cf?: { country?: string } }).cf?.country;
  if (cfCountry) {
    return cfCountry;
  }
  return request.headers.get('cf-ipcountry') || request.headers.get('CF-IPCountry');
}

function resolveLocale(request: NextRequest) {
  return resolveUiLocale({
    preferred: request.cookies.get(LOCALE_COOKIE)?.value,
    acceptLanguage: request.headers.get('accept-language'),
    country: readCountry(request),
  });
}

function applyLocaleCookie(response: NextResponse, locale: string) {
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
}

/**
 * 1. 语言：cookie → Accept-Language → CF 国家 → en（写入 NEXT_LOCALE）
 * 2. 鉴权：/app、/terminal 未登录 → /login?next=…
 * 产品面 localePrefix: never，路径不变。
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locale = resolveLocale(request);
  const hasLocaleCookie = Boolean(request.cookies.get(LOCALE_COOKIE)?.value);

  // 无 cookie 时用协商结果改写 Accept-Language，让 next-intl 选对语言
  let requestForIntl = request;
  if (!hasLocaleCookie) {
    const headers = new Headers(request.headers);
    headers.set('accept-language', locale);
    requestForIntl = new NextRequest(request.url, {
      headers,
      method: request.method,
    });
    for (const cookie of request.cookies.getAll()) {
      requestForIntl.cookies.set(cookie.name, cookie.value);
    }
  }

  if (
    pathname.startsWith('/app') ||
    pathname === '/terminal' ||
    pathname.startsWith('/terminal/')
  ) {
    if (!hasSessionCookie(request)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('next', pathname);
      const response = NextResponse.redirect(loginUrl);
      applyLocaleCookie(response, locale);
      return response;
    }
  }

  const response = intlMiddleware(requestForIntl);
  if (!hasLocaleCookie) {
    applyLocaleCookie(response, locale);
  }
  return response;
}

export const config = {
  // 含页面路由；排除 api / 静态资源
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
