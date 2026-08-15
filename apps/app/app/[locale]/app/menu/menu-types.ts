import type { MenuTree as DatabaseMenuTree } from '@taomenu/db';

export type MenuTree = DatabaseMenuTree;
export type MenuCategory = MenuTree['categories'][number];
export type MenuItem = MenuCategory['items'][number];

export function localizedName(
  translations: Array<{ locale: string; name: string }>,
  locale: string,
  baseLocale: string,
) {
  const active = translations.find((translation) => translation.locale === locale)?.name.trim();
  const fallback =
    translations.find((translation) => translation.locale === baseLocale)?.name.trim() ||
    translations[0]?.name.trim() ||
    '—';
  return { label: active || fallback, isMissing: locale !== baseLocale && !active };
}
