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
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
