import { DEFAULT_LOCALE, LOCALES } from '@taomenu/shared';
import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: [...LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
  // 浏览器语言由 middleware 与 geo 一起协商；此处仍开启 cookie 记忆
  localeDetection: true,
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
