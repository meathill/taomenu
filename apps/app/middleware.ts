import { resolveUiLocale } from '@taomenu/shared';
import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { readLocalePrefix, stripLocalePrefix } from './lib/locale-prefix';
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
 * 产品面路径不带语言前缀，同一 URL（如 /app/menu、/login）会随 NEXT_LOCALE 切换语言。
 * 加上 Vary: Cookie，并在语言被前缀改写或访问店主页时禁止缓存，避免 CDN / 浏览器 /
 * 客户端 RSC 缓存把上一种语言的 HTML 再发出去。
 */
function applyLocaleCacheHeaders(response: NextResponse, noStore: boolean) {
  const vary = response.headers.get('Vary');
  if (!vary) {
    response.headers.set('Vary', 'Cookie');
  } else if (!/\bCookie\b/i.test(vary)) {
    response.headers.set('Vary', `${vary}, Cookie`);
  }
  if (noStore) {
    response.headers.set('Cache-Control', 'private, no-store');
  }
}

function isLocaleSensitivePath(pathname: string): boolean {
  return (
    pathname.startsWith('/app') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/agent') ||
    pathname === '/terminal' ||
    pathname.startsWith('/terminal/')
  );
}

function isProtectedPath(pathname: string): boolean {
  if (
    pathname.startsWith('/app') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/agent')
  ) {
    return true;
  }
  if (pathname === '/terminal' || pathname.startsWith('/terminal/')) {
    return pathname !== '/terminal/pair';
  }
  return false;
}

/** 克隆请求：路径去掉前缀，Cookie / Accept-Language 用前缀语言，供 next-intl 当场选用。 */
function cloneRequestForLocale(
  request: NextRequest,
  locale: string,
  pathname: string,
): NextRequest {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  const headers = new Headers(request.headers);
  headers.set('accept-language', locale);
  const cookies = request.cookies
    .getAll()
    .filter((cookie) => cookie.name !== LOCALE_COOKIE)
    .map((cookie) => `${cookie.name}=${cookie.value}`);
  cookies.push(`${LOCALE_COOKIE}=${locale}`);
  headers.set('cookie', cookies.join('; '));
  return new NextRequest(url, {
    headers,
    method: request.method,
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
 * 1. 语言：URL 前缀（/zh/login）→ cookie → Accept-Language → CF 国家 → en（写入 NEXT_LOCALE）
 *    前缀是明确意图，必须压过 cookie 与协商（issue #27）。有前缀时先去掉前缀再交给
 *    next-intl，并把请求上的 NEXT_LOCALE / Accept-Language 改成前缀语言，避免先按旧
 *    cookie 渲染、刷新后才生效。产品面 localePrefix: never，对外路径仍不带前缀。
 * 2. 鉴权：/app、/admin、/agent、/terminal 未登录 → /login?next=…
 *    （只粗判 cookie，真鉴权在 layout / API 层的 requireAdmin / requireAgent）
 * 3. 归因：?ref=CODE → tm_ref cookie
 */
export default function middleware(request: NextRequest) {
  const prefixLocale = readLocalePrefix(request.nextUrl.pathname);
  const unprefixedPath = stripLocalePrefix(request.nextUrl.pathname);
  const locale = prefixLocale ?? resolveLocale(request);
  const hasLocaleCookie = Boolean(request.cookies.get(LOCALE_COOKIE)?.value);
  // 有前缀时总是以前缀为准写 cookie；无前缀时只在首次访问写入协商结果
  const shouldWriteLocaleCookie = prefixLocale !== null || !hasLocaleCookie;
  const incomingCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const localeChanged = Boolean(prefixLocale && incomingCookie && incomingCookie !== prefixLocale);

  let requestForIntl = request;
  if (prefixLocale) {
    requestForIntl = cloneRequestForLocale(request, prefixLocale, unprefixedPath);
  } else if (!hasLocaleCookie) {
    // 无 cookie 时用协商结果改写 Accept-Language，让 next-intl 选对语言
    requestForIntl = cloneRequestForLocale(request, locale, unprefixedPath);
  }

  if (isProtectedPath(unprefixedPath) && !hasSessionCookie(request)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    // next 用去掉前缀后的路径（如 ?upgrade=pro），登录后不丢意图、也不再带 /vi
    loginUrl.search = '';
    loginUrl.searchParams.set('next', `${unprefixedPath}${request.nextUrl.search}`);
    const response = NextResponse.redirect(loginUrl);
    applyLocaleCookie(response, locale);
    applyLocaleCacheHeaders(response, true);
    applyRefCookie(request, response);
    return response;
  }

  const response = intlMiddleware(requestForIntl);
  if (shouldWriteLocaleCookie) {
    applyLocaleCookie(response, locale);
  }
  applyLocaleCacheHeaders(
    response,
    Boolean(prefixLocale) || localeChanged || isLocaleSensitivePath(unprefixedPath),
  );
  applyRefCookie(request, response);
  return response;
}

export const config = {
  // 含页面路由；排除 api / 静态资源
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
