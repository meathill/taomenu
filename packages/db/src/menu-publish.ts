import { getPlanLimits, type PlanId } from '@taomenu/shared';

export type PublishableTranslation = {
  locale: string;
  name: string;
};

export type PublishableItem = {
  id: string;
  priceAmount: number;
  isAvailable: boolean;
  translations: PublishableTranslation[];
};

export type PublishableCategory = {
  id: string;
  isAvailable: boolean;
  translations: PublishableTranslation[];
  items: PublishableItem[];
};

export type PublishableMenu = {
  categories: PublishableCategory[];
};

export type PublishIssue = {
  code:
    | 'EMPTY_MENU'
    | 'NO_AVAILABLE_ITEM'
    | 'CATEGORY_MISSING_BASE_LOCALE'
    | 'ITEM_MISSING_BASE_LOCALE'
    | 'INVALID_PRICE'
    | 'TOO_MANY_LOCALES';
  message: string;
  entityId?: string;
};

/**
 * 发布前纯函数校验：至少一类可用菜品、基础语言完整、价格合法、Free 单语言。
 */
export function validateMenuForPublish(input: {
  menu: PublishableMenu;
  baseLocale: string;
  plan: PlanId;
}): PublishIssue[] {
  const { menu, baseLocale, plan } = input;
  const issues: PublishIssue[] = [];
  const limits = getPlanLimits(plan);

  if (menu.categories.length === 0) {
    issues.push({ code: 'EMPTY_MENU', message: 'Menu has no categories' });
    return issues;
  }

  const locales = new Set<string>();
  let availableItemCount = 0;

  for (const category of menu.categories) {
    for (const tr of category.translations) {
      locales.add(tr.locale);
    }
    const baseCat = category.translations.find((t) => t.locale === baseLocale);
    if (!baseCat?.name.trim()) {
      issues.push({
        code: 'CATEGORY_MISSING_BASE_LOCALE',
        message: `Category missing ${baseLocale} name`,
        entityId: category.id,
      });
    }

    for (const item of category.items) {
      for (const tr of item.translations) {
        locales.add(tr.locale);
      }
      const baseItem = item.translations.find((t) => t.locale === baseLocale);
      if (!baseItem?.name.trim()) {
        issues.push({
          code: 'ITEM_MISSING_BASE_LOCALE',
          message: `Item missing ${baseLocale} name`,
          entityId: item.id,
        });
      }
      if (!Number.isInteger(item.priceAmount) || item.priceAmount < 0) {
        issues.push({
          code: 'INVALID_PRICE',
          message: 'Item price must be a non-negative integer in the store currency minor unit',
          entityId: item.id,
        });
      }
      if (item.isAvailable && category.isAvailable) {
        availableItemCount += 1;
      }
    }
  }

  if (availableItemCount === 0) {
    issues.push({
      code: 'NO_AVAILABLE_ITEM',
      message: 'At least one available item is required to publish',
    });
  }

  if (locales.size > limits.maxMenuLocales) {
    issues.push({
      code: 'TOO_MANY_LOCALES',
      message: `Plan allows at most ${limits.maxMenuLocales} menu locale(s)`,
    });
  }

  return issues;
}

/** Free 只能有 baseLocale 一种已发布语言。 */
export function assertLocaleAllowed(input: {
  plan: PlanId;
  baseLocale: string;
  locale: string;
  existingLocales: string[];
}): PublishIssue | null {
  const limits = getPlanLimits(input.plan);
  if (input.locale === input.baseLocale) {
    return null;
  }
  const next = new Set(input.existingLocales);
  next.add(input.locale);
  if (next.size > limits.maxMenuLocales) {
    return {
      code: 'TOO_MANY_LOCALES',
      message: `Plan allows at most ${limits.maxMenuLocales} menu locale(s)`,
    };
  }
  return null;
}
