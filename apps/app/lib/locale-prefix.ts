import { isLocale, type Locale } from '@taomenu/shared';

/**
 * 读取 URL 的语言前缀（/zh/login → zh）。产品面虽然是 localePrefix: never，
 * 但带前缀的链接（定价页、邮件、分享）表达了明确的语言意图，必须优先于
 * cookie / Accept-Language / 国家协商（issue #27）。
 */
export function readLocalePrefix(pathname: string): Locale | null {
  const segment = pathname.split('/')[1];
  return isLocale(segment) ? segment : null;
}

/** `/vi/app/menu` → `/app/menu`；`/vi` → `/`；无前缀则原样返回。 */
export function stripLocalePrefix(pathname: string): string {
  const locale = readLocalePrefix(pathname);
  if (!locale) {
    return pathname;
  }
  const stripped = pathname.slice(`/${locale}`.length);
  if (!stripped) {
    return '/';
  }
  return stripped.startsWith('/') ? stripped : `/${stripped}`;
}
