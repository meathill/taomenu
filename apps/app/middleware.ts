import { resolveUiLocale } from '@taomenu/shared';
import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import {
  normalizeRefCode,
  REF_COOKIE_MAX_AGE_SECONDS,
  REF_COOKIE_NAME,
  REF_QUERY_PARAM,
} from './lib/ref-click';

const intlMiddleware = createMiddleware(routing);

const LOCALE_COOKIE = 'NEXT_LOCALE';

/**
 * 只认 TaoMenu 的 session cookie（cookiePrefix: taomenu）。
 * 勿匹配主站 better-auth.*，否则会误放行又在 getSession 时失败回登录。
 */
function hasSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((cookie) => {
    if (!cookie.value) {
      return false;
    }
    const name = cookie.name.toLowerCase();
    // __Secure-taomenu.session_token / taomenu.session_token
    return (
      name.includes('taomenu') && (name.includes('session_token') || name.includes('session-token'))
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
 * 代理商归因：`?ref=CODE` 合法且当前没有 tm_ref 时落 30 天 cookie（首触优先，不覆盖）。
 * 刻意不设 domain（host-only）：.dyqr.me 根域上还有另一个 better-auth 站点，共享 cookie 会互相污染。
 * middleware 里不碰 D1，点击上报走 /api/public/ref-click。
 */
function applyRefCookie(request: NextRequest, response: NextResponse): void {
  const code = normalizeRefCode(request.nextUrl.searchParams.get(REF_QUERY_PARAM));
  if (!code || request.cookies.get(REF_COOKIE_NAME)?.value) {
    return;
  }

  response.cookies.set(REF_COOKIE_NAME, code, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: request.nextUrl.protocol === 'https:',
    maxAge: REF_COOKIE_MAX_AGE_SECONDS,
  });
}

/**
 * 1. 语言：cookie → Accept-Language → CF 国家 → en（写入 NEXT_LOCALE）
 * 2. 鉴权：/app、/admin、/agent、/terminal 未登录 → /login?next=…
 *    （只粗判 cookie，真鉴权在 layout / API 层的 requireAdmin / requireAgent）
 * 3. 归因：?ref=CODE → tm_ref cookie
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
    pathname.startsWith('/admin') ||
    pathname.startsWith('/agent') ||
    pathname === '/terminal' ||
    pathname.startsWith('/terminal/')
  ) {
    const isPairingPage = pathname === '/terminal/pair';
    if (!isPairingPage && !hasSessionCookie(request)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('next', pathname);
      const response = NextResponse.redirect(loginUrl);
      applyLocaleCookie(response, locale);
      applyRefCookie(request, response);
      return response;
    }
  }

  const response = intlMiddleware(requestForIntl);
  if (!hasLocaleCookie) {
    applyLocaleCookie(response, locale);
  }
  applyRefCookie(request, response);
  return response;
}

export const config = {
  // 含页面路由；排除 api / 静态资源
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
