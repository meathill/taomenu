import { and, asc, eq, inArray } from 'drizzle-orm';
import {
  menuCategories,
  menuCategoryTranslations,
  menuItems,
  menuItemTranslations,
  menus,
} from '../schema/menu';
import { stores } from '../schema/stores';
import type { Db } from '../types';
import { loadModifierGroupsForItems } from './modifiers';

export type PublicModifierOption = {
  id: string;
  name: string;
  priceDeltaAmount: number;
};

export type PublicModifierGroup = {
  id: string;
  name: string;
  minSelected: number;
  maxSelected: number;
  isRequired: boolean;
  options: PublicModifierOption[];
};

export type PublicMenuPayload = {
  availableLocales: string[];
  resolvedLocale: string;
  store: {
    id: string;
    slug: string;
    name: string;
    currency: string;
    baseLocale: string;
    menuVersion: number;
    acceptingPublicRequests: boolean;
  };
  table?: { id: string; name: string };
  pickupPoint?: { id: string; name: string };
  categories: Array<{
    id: string;
    name: string;
    items: Array<{
      id: string;
      name: string;
      description: string | null;
      priceAmount: number;
      isSoldOut: boolean;
      /** R2 object key；前端拼 `/api/media/...` */
      imageKey: string | null;
      modifierGroups: PublicModifierGroup[];
    }>;
  }>;
};

type LocalizedName = { locale: string; name: string };

export type PublicMenuLocaleSource = Array<{
  translations: LocalizedName[];
  items: Array<{
    translations: LocalizedName[];
    modifierGroups: Array<{
      translations: LocalizedName[];
      options: Array<{ isAvailable: boolean; translations: LocalizedName[] }>;
    }>;
  }>;
}>;

function hasNamedLocale(translations: LocalizedName[], locale: string) {
  return translations.some(
    (translation) => translation.locale === locale && translation.name.trim(),
  );
}

/** 顾客端仅公开所有可见内容均已翻译的第二语言。 */
export function getCompleteMenuLocales(
  categories: PublicMenuLocaleSource,
  baseLocale: string,
): string[] {
  const candidates = new Set<string>([baseLocale]);
  for (const category of categories) {
    for (const translation of category.translations) candidates.add(translation.locale);
    for (const item of category.items) {
      for (const translation of item.translations) candidates.add(translation.locale);
      for (const group of item.modifierGroups) {
        for (const translation of group.translations) candidates.add(translation.locale);
        for (const option of group.options) {
          for (const translation of option.translations) candidates.add(translation.locale);
        }
      }
    }
  }

  const complete = [...candidates].filter((locale) => {
    if (locale === baseLocale) return true;
    return categories.every(
      (category) =>
        hasNamedLocale(category.translations, locale) &&
        category.items.every(
          (item) =>
            hasNamedLocale(item.translations, locale) &&
            item.modifierGroups.every(
              (group) =>
                hasNamedLocale(group.translations, locale) &&
                group.options
                  .filter((option) => option.isAvailable)
                  .every((option) => hasNamedLocale(option.translations, locale)),
            ),
        ),
    );
  });
  return [baseLocale, ...complete.filter((locale) => locale !== baseLocale).sort()];
}

export function resolvePublicMenuLocale(
  availableLocales: string[],
  baseLocale: string,
  requestedLocale?: string,
): string {
  return requestedLocale && availableLocales.includes(requestedLocale)
    ? requestedLocale
    : baseLocale;
}

export async function getPublishedMenuForStore(
  db: Db,
  storeId: string,
  locale?: string,
): Promise<PublicMenuPayload | null> {
  const storeRows = await db
    .select()
    .from(stores)
    .where(and(eq(stores.id, storeId), eq(stores.isActive, true)))
    .limit(1);
  const store = storeRows[0];
  if (!store) return null;

  const menuRows = await db
    .select()
    .from(menus)
    .where(and(eq(menus.storeId, storeId), eq(menus.status, 'published')))
    .limit(1);
  const menu = menuRows[0];
  if (!menu) {
    return {
      availableLocales: [store.baseLocale],
      resolvedLocale: store.baseLocale,
      store: {
        id: store.id,
        slug: store.slug,
        name: store.name,
        currency: store.currency,
        baseLocale: store.baseLocale,
        menuVersion: store.menuVersion,
        acceptingPublicRequests: store.acceptingPublicRequests,
      },
      categories: [],
    };
  }

  const categories = await db
    .select()
    .from(menuCategories)
    .where(
      and(
        eq(menuCategories.storeId, storeId),
        eq(menuCategories.menuId, menu.id),
        eq(menuCategories.isAvailable, true),
      ),
    )
    .orderBy(asc(menuCategories.sortOrder));

  const categoryIds = categories.map((c) => c.id);
  if (categoryIds.length === 0) {
    return {
      availableLocales: [store.baseLocale],
      resolvedLocale: store.baseLocale,
      store: {
        id: store.id,
        slug: store.slug,
        name: store.name,
        currency: store.currency,
        baseLocale: store.baseLocale,
        menuVersion: store.menuVersion,
        acceptingPublicRequests: store.acceptingPublicRequests,
      },
      categories: [],
    };
  }

  const catTr = await db
    .select()
    .from(menuCategoryTranslations)
    .where(
      and(
        eq(menuCategoryTranslations.storeId, storeId),
        inArray(menuCategoryTranslations.categoryId, categoryIds),
      ),
    );

  const items = await db
    .select()
    .from(menuItems)
    .where(
      and(
        eq(menuItems.storeId, storeId),
        inArray(menuItems.categoryId, categoryIds),
        eq(menuItems.isAvailable, true),
      ),
    )
    .orderBy(asc(menuItems.sortOrder));

  const itemIds = items.map((i) => i.id);
  const itemTr =
    itemIds.length === 0
      ? []
      : await db
          .select()
          .from(menuItemTranslations)
          .where(
            and(
              eq(menuItemTranslations.storeId, storeId),
              inArray(menuItemTranslations.itemId, itemIds),
            ),
          );

  const modifiersByItem = await loadModifierGroupsForItems(db, storeId, itemIds);

  const localeSource: PublicMenuLocaleSource = categories.map((category) => ({
    translations: catTr.filter((translation) => translation.categoryId === category.id),
    items: items
      .filter((item) => item.categoryId === category.id)
      .map((item) => ({
        translations: itemTr.filter((translation) => translation.itemId === item.id),
        modifierGroups: modifiersByItem.get(item.id) ?? [],
      })),
  }));
  const availableLocales = getCompleteMenuLocales(localeSource, store.baseLocale);
  const resolvedLocale = resolvePublicMenuLocale(availableLocales, store.baseLocale, locale);

  function pickName(
    translations: Array<{ locale: string; name: string; description?: string | null }>,
    baseLocale: string,
  ) {
    return (
      translations.find((t) => t.locale === resolvedLocale) ||
      translations.find((t) => t.locale === baseLocale) ||
      translations[0]
    );
  }

  return {
    availableLocales,
    resolvedLocale,
    store: {
      id: store.id,
      slug: store.slug,
      name: store.name,
      currency: store.currency,
      baseLocale: store.baseLocale,
      menuVersion: store.menuVersion,
      acceptingPublicRequests: store.acceptingPublicRequests,
    },
    categories: categories.map((category) => {
      const tr = pickName(
        catTr.filter((t) => t.categoryId === category.id),
        store.baseLocale,
      );
      return {
        id: category.id,
        name: tr?.name ?? '—',
        items: items
          .filter((item) => item.categoryId === category.id)
          .map((item) => {
            const itr = pickName(
              itemTr.filter((t) => t.itemId === item.id),
              store.baseLocale,
            );
            const groups = modifiersByItem.get(item.id) ?? [];
            return {
              id: item.id,
              name: itr?.name ?? '—',
              description: itr?.description ?? null,
              priceAmount: item.priceAmount,
              isSoldOut: item.isSoldOut,
              imageKey: item.imageKey,
              modifierGroups: groups.map((g) => {
                const gName =
                  g.translations.find((t) => t.locale === resolvedLocale)?.name ||
                  g.translations.find((t) => t.locale === store.baseLocale)?.name ||
                  g.translations[0]?.name ||
                  '—';
                return {
                  id: g.id,
                  name: gName,
                  minSelected: g.isRequired ? Math.max(g.minSelected, 1) : g.minSelected,
                  maxSelected: g.maxSelected,
                  isRequired: g.isRequired,
                  options: g.options
                    .filter((o) => o.isAvailable)
                    .map((o) => {
                      const oName =
                        o.translations.find((t) => t.locale === resolvedLocale)?.name ||
                        o.translations.find((t) => t.locale === store.baseLocale)?.name ||
                        o.translations[0]?.name ||
                        '—';
                      return {
                        id: o.id,
                        name: oName,
                        priceDeltaAmount: o.priceDeltaAmount,
                      };
                    }),
                };
              }),
            };
          }),
      };
    }),
  };
}
