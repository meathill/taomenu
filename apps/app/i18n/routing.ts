import { DEFAULT_LOCALE, LOCALES } from '@taomenu/shared';
import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

/**
 * 产品面路径保持 /login /app /m/*，不用 /en 前缀，避免破坏 Auth、API 与桌码链接。
 * 语言靠 cookie + Accept-Language + IP 协商。
 */
export const routing = defineRouting({
  locales: [...LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'never',
  localeDetection: true,
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
