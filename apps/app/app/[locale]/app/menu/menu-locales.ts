import type { MenuTree } from './menu-types';

/** 当前菜单里已经出现的语言（含基础语言），用于判断能否再加一种 */
export function collectMenuLocales(tree: MenuTree, baseLocale: string): string[] {
  const locales = new Set<string>([baseLocale]);
  for (const category of tree.categories) {
    for (const translation of category.translations) locales.add(translation.locale);
    for (const item of category.items) {
      for (const translation of item.translations) locales.add(translation.locale);
      for (const group of item.modifierGroups ?? []) {
        for (const translation of group.translations) locales.add(translation.locale);
        for (const option of group.options) {
          for (const translation of option.translations) locales.add(translation.locale);
        }
      }
    }
  }
  return [...locales];
}
