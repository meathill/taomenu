import { DEFAULT_LOCALE, LOCALES, type Locale } from '@taomenu/shared';
import { getBlogSlugForLocale, resolveBlogContentKey } from './blog-slugs';

const NON_DEFAULT_LOCALE_PATTERN = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE).join('|');
const BLOG_PATH_PATTERN = new RegExp(`^/(?:(${NON_DEFAULT_LOCALE_PATTERN})/)?blog/([^/]+)$`);

/**
 * 把任意语言下的非 canonical blog slug 归一为当前语言的公开 slug。
 * 未知文章返回 null，保持原有 404；正确的本地化 slug 也返回 null。
 */
export function resolveBlogRedirect(pathname: string): string | null {
  const match = BLOG_PATH_PATTERN.exec(pathname);
  if (!match) {
    return null;
  }
  const [, localePrefix, slug] = match;
  if (!slug) {
    return null;
  }
  const locale = (localePrefix as Locale | undefined) ?? DEFAULT_LOCALE;
  const contentKey = resolveBlogContentKey(slug);
  if (!contentKey) {
    return null;
  }
  const expectedSlug = getBlogSlugForLocale(contentKey, locale);
  if (expectedSlug === slug) {
    return null;
  }
  return locale === DEFAULT_LOCALE ? `/blog/${expectedSlug}` : `/${locale}/blog/${expectedSlug}`;
}
