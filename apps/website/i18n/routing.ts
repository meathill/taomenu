import { DEFAULT_LOCALE, LOCALES } from '@taomenu/shared';
import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: [...LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
  // as-needed：默认语言 en 裸路径（/pricing），其余语言带前缀（/ja/pricing）
  // 裸路径固定为 en，不做 Accept-Language / cookie 协商（避免裸路径被重定向到 /ja 等）
  localeDetection: false,
  // hreflang 只由页面 metadata 输出（buildAlternates / buildBlogAlternates）。
  // next-intl 的 Link 头只会替换 locale 前缀，无法处理 blog 各语言不同 slug，
  // 会与 HTML 里的正确 hreflang 冲突。
  alternateLinks: false,
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
