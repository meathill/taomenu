import { isMenuLocaleAllowed, type PlanId } from '@taomenu/shared';
import type { MenuTree } from './menu-types';

const ENABLED_LOCALES_KEY_PREFIX = 'taomenu.enabledMenuLocales.';

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

/**
 * 已占用的菜单语言：已有译文 + 当前正在编辑的语言。
 * 免费店选了英语但还没写下译文时，英语也占掉「额外 1 种」的名额，不能再切到日语。
 */
export function occupiedMenuLocales(input: {
  existingLocales: string[];
  baseLocale: string;
  activeLocale?: string;
  reservedLocales?: string[];
}): string[] {
  const locales = new Set<string>([input.baseLocale, ...input.existingLocales]);
  if (input.activeLocale) locales.add(input.activeLocale);
  for (const locale of input.reservedLocales ?? []) {
    locales.add(locale);
  }
  return [...locales];
}

export function isMenuLocaleLocked(input: {
  plan: PlanId;
  baseLocale: string;
  locale: string;
  existingLocales: string[];
  activeLocale?: string;
  reservedLocales?: string[];
}): boolean {
  return !isMenuLocaleAllowed({
    plan: input.plan,
    baseLocale: input.baseLocale,
    locale: input.locale,
    existingLocales: occupiedMenuLocales(input),
  });
}

export function readReservedMenuLocales(storeId: string): string[] {
  if (typeof sessionStorage === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(`${ENABLED_LOCALES_KEY_PREFIX}${storeId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string' && value.length > 0);
  } catch {
    return [];
  }
}

export function rememberReservedMenuLocale(
  storeId: string,
  locale: string,
  baseLocale: string,
): string[] {
  if (locale === baseLocale) return readReservedMenuLocales(storeId);
  const next = [...new Set([...readReservedMenuLocales(storeId), locale])];
  if (typeof sessionStorage === 'undefined') return next;
  try {
    sessionStorage.setItem(`${ENABLED_LOCALES_KEY_PREFIX}${storeId}`, JSON.stringify(next));
  } catch {
    // 隐私模式等写不进 storage 时，仍把本次选择算进占用名额
  }
  return next;
}
