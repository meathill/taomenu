import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { JA_BLOG_SLUG_REDIRECTS } from './lib/blog-slugs';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 0) 日文博客旧越南语 slug → 罗马字本地化 slug（301，issue #12）
  const jaBlogMatch = /^\/ja\/blog\/([^/]+)$/.exec(pathname);
  if (jaBlogMatch?.[1]) {
    const target = JA_BLOG_SLUG_REDIRECTS[jaBlogMatch[1]];
    if (target) {
      const url = request.nextUrl.clone();
      url.pathname = `/ja/blog/${target}`;
      return NextResponse.redirect(url, 301);
    }
  }

  // 1) /en 前缀归一到裸路径（308），裸路径即 en；同时去尾 /
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    let bare = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
    if (bare.length > 1 && bare.endsWith('/')) {
      bare = bare.replace(/\/+$/, '');
    }
    const url = request.nextUrl.clone();
    url.pathname = bare;
    return NextResponse.redirect(url, 308);
  }

  // 2) 尾斜杠统一：除根 / 外，一律 308 去尾 /
  if (pathname.length > 1 && pathname.endsWith('/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/\/+$/, '');
    return NextResponse.redirect(url, 308);
  }

  // 3) 其余：带非默认前缀（/zh /ja /vi）或裸路径，交给 next-intl
  //    裸路径在 as-needed 模式下即 en，不再做 cookie/Accept-Language 协商
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/', '/(en|zh|ja|vi)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
