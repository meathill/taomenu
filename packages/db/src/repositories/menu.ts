import { and, asc, eq, inArray } from 'drizzle-orm';
import { type PublishableMenu, validateMenuForPublish } from '../menu-publish';
import {
  menuCategories,
  menuCategoryTranslations,
  menuItems,
  menuItemTranslations,
  menus,
} from '../schema/menu';
import { stores } from '../schema/stores';
import { nowMs } from '../time';
import type { Db, StoreContext } from '../types';
import { loadModifierGroupsForItems, type MenuModifierGroup } from './modifiers';

export type MenuTreeCategory = {
  id: string;
  sortOrder: number;
  isAvailable: boolean;
  translations: Array<{
    locale: string;
    name: string;
    description: string | null;
  }>;
  items: Array<{
    id: string;
    priceAmount: number;
    sortOrder: number;
    isAvailable: boolean;
    isSoldOut: boolean;
    imageKey: string | null;
    translations: Array<{
      locale: string;
      name: string;
      description: string | null;
    }>;
    modifierGroups: MenuModifierGroup[];
  }>;
};

export type MenuTree = {
  menu: {
    id: string;
    name: string;
    status: string;
    publishedAt: Date | null;
    menuVersion: number;
    baseLocale: string;
  };
  categories: MenuTreeCategory[];
};

/** 确保门店有一份 draft/published 菜单；MVP 每店一份。 */
export async function ensureStoreMenu(ctx: StoreContext, db: Db) {
  const existing = await db
    .select()
    .from(menus)
    .where(eq(menus.storeId, ctx.storeId))
    .orderBy(asc(menus.createdAt))
    .limit(1);

  if (existing[0]) {
    return existing[0];
  }

  const createdAt = nowMs();
  const row = {
    id: crypto.randomUUID(),
    storeId: ctx.storeId,
    name: 'Menu',
    status: 'draft' as const,
    publishedAt: null,
    createdAt,
    updatedAt: createdAt,
  };
  await db.insert(menus).values(row);
  return row;
}

export async function getMenuTree(ctx: StoreContext, db: Db): Promise<MenuTree> {
  const menu = await ensureStoreMenu(ctx, db);
  const storeRows = await db
    .select({
      baseLocale: stores.baseLocale,
      menuVersion: stores.menuVersion,
    })
    .from(stores)
    .where(eq(stores.id, ctx.storeId))
    .limit(1);
  const storeMeta = storeRows[0] ?? { baseLocale: 'vi', menuVersion: 0 };

  const categories = await db
    .select()
    .from(menuCategories)
    .where(and(eq(menuCategories.storeId, ctx.storeId), eq(menuCategories.menuId, menu.id)))
    .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.createdAt));

  const categoryIds = categories.map((c) => c.id);
  const catTranslations =
    categoryIds.length === 0
      ? []
      : await db
          .select()
          .from(menuCategoryTranslations)
          .where(
            and(
              eq(menuCategoryTranslations.storeId, ctx.storeId),
              inArray(menuCategoryTranslations.categoryId, categoryIds),
            ),
          );

  const items =
    categoryIds.length === 0
      ? []
      : await db
          .select()
          .from(menuItems)
          .where(
            and(eq(menuItems.storeId, ctx.storeId), inArray(menuItems.categoryId, categoryIds)),
          )
          .orderBy(asc(menuItems.sortOrder), asc(menuItems.createdAt));

  const itemIds = items.map((i) => i.id);
  const itemTranslations =
    itemIds.length === 0
      ? []
      : await db
          .select()
          .from(menuItemTranslations)
          .where(
            and(
              eq(menuItemTranslations.storeId, ctx.storeId),
              inArray(menuItemTranslations.itemId, itemIds),
            ),
          );

  const modifiersByItem = await loadModifierGroupsForItems(db, ctx.storeId, itemIds);

  const treeCategories: MenuTreeCategory[] = categories.map((category) => ({
    id: category.id,
    sortOrder: category.sortOrder,
    isAvailable: category.isAvailable,
    translations: catTranslations
      .filter((t) => t.categoryId === category.id)
      .map((t) => ({
        locale: t.locale,
        name: t.name,
        description: t.description,
      })),
    items: items
      .filter((item) => item.categoryId === category.id)
      .map((item) => ({
        id: item.id,
        priceAmount: item.priceAmount,
        sortOrder: item.sortOrder,
        isAvailable: item.isAvailable,
        isSoldOut: item.isSoldOut,
        imageKey: item.imageKey,
        translations: itemTranslations
          .filter((t) => t.itemId === item.id)
          .map((t) => ({
            locale: t.locale,
            name: t.name,
            description: t.description,
          })),
        modifierGroups: modifiersByItem.get(item.id) ?? [],
      })),
  }));

  return {
    menu: {
      id: menu.id,
      name: menu.name,
      status: menu.status,
      publishedAt: menu.publishedAt,
      menuVersion: storeMeta.menuVersion,
      baseLocale: storeMeta.baseLocale,
    },
    categories: treeCategories,
  };
}

function treeToPublishable(tree: MenuTree): PublishableMenu {
  return {
    categories: tree.categories.map((c) => ({
      id: c.id,
      isAvailable: c.isAvailable,
      translations: c.translations.map((t) => ({ locale: t.locale, name: t.name })),
      items: c.items.map((i) => ({
        id: i.id,
        priceAmount: i.priceAmount,
        isAvailable: i.isAvailable,
        translations: i.translations.map((t) => ({ locale: t.locale, name: t.name })),
      })),
    })),
  };
}

export async function listMenuLocales(ctx: StoreContext, db: Db): Promise<string[]> {
  const tree = await getMenuTree(ctx, db);
  const locales = new Set<string>();
  for (const c of tree.categories) {
    for (const t of c.translations) locales.add(t.locale);
    for (const i of c.items) {
      for (const t of i.translations) locales.add(t.locale);
    }
  }
  locales.add(tree.menu.baseLocale);
  return [...locales];
}

export async function publishMenu(ctx: StoreContext, db: Db) {
  const tree = await getMenuTree(ctx, db);
  const issues = validateMenuForPublish({
    menu: treeToPublishable(tree),
    baseLocale: tree.menu.baseLocale,
    plan: ctx.plan,
  });
  if (issues.length > 0) {
    throw new MenuValidationError(issues);
  }

  const publishedAt = nowMs();
  const nextVersion = tree.menu.menuVersion + 1;

  await db
    .update(menus)
    .set({ status: 'published', publishedAt, updatedAt: publishedAt })
    .where(and(eq(menus.id, tree.menu.id), eq(menus.storeId, ctx.storeId)));
  await db
    .update(stores)
    .set({ menuVersion: nextVersion, updatedAt: publishedAt })
    .where(eq(stores.id, ctx.storeId));

  return { menuVersion: nextVersion, publishedAt };
}

export async function getBaseLocale(ctx: StoreContext, db: Db): Promise<string> {
  const rows = await db
    .select({ baseLocale: stores.baseLocale })
    .from(stores)
    .where(eq(stores.id, ctx.storeId))
    .limit(1);
  return rows[0]?.baseLocale ?? 'vi';
}

export class MenuValidationError extends Error {
  readonly issues: ReturnType<typeof validateMenuForPublish>;

  constructor(issues: ReturnType<typeof validateMenuForPublish>) {
    super(issues[0]?.message ?? 'Menu validation failed');
    this.name = 'MenuValidationError';
    this.issues = issues;
  }
}
