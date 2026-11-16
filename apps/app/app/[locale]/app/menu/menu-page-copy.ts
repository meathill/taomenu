import { hasProEntitlements, isMenuLocaleAllowed, type PlanId } from '@taomenu/shared';

const SUPPORTED_MENU_LOCALES = new Set(['en', 'vi', 'zh', 'ja']);

export function getMenuSubtitleKey(plan: PlanId) {
  return hasProEntitlements(plan) ? 'subtitlePro' : 'subtitle';
}

/** Free 也能切到额外的一种语言；只有超出套餐上限时才退回基础语言 */
export function resolveActiveMenuLocale(input: {
  plan: PlanId;
  baseLocale: string;
  requested: string | undefined;
  existingLocales: string[];
}): string {
  const requested = input.requested;
  if (
    requested &&
    SUPPORTED_MENU_LOCALES.has(requested) &&
    isMenuLocaleAllowed({
      plan: input.plan,
      baseLocale: input.baseLocale,
      locale: requested,
      existingLocales: input.existingLocales,
    })
  ) {
    return requested;
  }
  return input.baseLocale;
}
