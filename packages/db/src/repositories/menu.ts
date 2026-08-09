import { and, asc, eq, inArray } from 'drizzle-orm';
import { assertLocaleAllowed, type PublishableMenu, validateMenuForPublish } from '../menu-publish';
import {
  menuCategories,
  menuCategoryTranslations,
  menuItems,
  menuItemTranslations,
  menus,
} from '../schema/menu';
import { stores } from '../schema/stores';
import type { Db, StoreContext } from '../types';
import {
  copyModifiersToItem,
  loadModifierGroupsForItems,
  type MenuModifierGroup,
} from './modifiers';

function nowMs(): Date {
  return new Date();
}

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

export async function createCategory(
  ctx: StoreContext,
  db: Db,
  input: { name: string; description?: string; locale?: string },
) {
  const menu = await ensureStoreMenu(ctx, db);
  const locale = input.locale ?? (await getBaseLocale(ctx, db));
  const localeIssue = assertLocaleAllowed({
    plan: ctx.plan,
    baseLocale: await getBaseLocale(ctx, db),
    locale,
    existingLocales: await listMenuLocales(ctx, db),
  });
  if (localeIssue) {
    throw new MenuValidationError([localeIssue]);
  }

  const createdAt = nowMs();
  const categoryId = crypto.randomUUID();
  const maxSort = await db
    .select({ sortOrder: menuCategories.sortOrder })
    .from(menuCategories)
    .where(and(eq(menuCategories.storeId, ctx.storeId), eq(menuCategories.menuId, menu.id)))
    .orderBy(asc(menuCategories.sortOrder));
  const sortOrder = (maxSort.at(-1)?.sortOrder ?? -1) + 1;

  await db.insert(menuCategories).values({
    id: categoryId,
    storeId: ctx.storeId,
    menuId: menu.id,
    sortOrder,
    isAvailable: true,
    createdAt,
    updatedAt: createdAt,
  });
  await db.insert(menuCategoryTranslations).values({
    id: crypto.randomUUID(),
    storeId: ctx.storeId,
    categoryId,
    locale,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    source: 'manual',
    reviewStatus: 'reviewed',
    sourceGenerationId: null,
    reviewedByUserId: ctx.userId,
    reviewedAt: createdAt,
  });

  return { categoryId };
}

export async function updateCategory(
  ctx: StoreContext,
  db: Db,
  categoryId: string,
  input: {
    name?: string;
    description?: string | null;
    isAvailable?: boolean;
    sortOrder?: number;
    locale?: string;
  },
) {
  const rows = await db
    .select()
    .from(menuCategories)
    .where(and(eq(menuCategories.id, categoryId), eq(menuCategories.storeId, ctx.storeId)))
    .limit(1);
  if (!rows[0]) {
    return null;
  }

  const locale = input.locale ?? (await getBaseLocale(ctx, db));
  const updatedAt = nowMs();

  await db
    .update(menuCategories)
    .set({
      isAvailable: input.isAvailable ?? rows[0].isAvailable,
      sortOrder: input.sortOrder ?? rows[0].sortOrder,
      updatedAt,
    })
    .where(and(eq(menuCategories.id, categoryId), eq(menuCategories.storeId, ctx.storeId)));

  if (input.name !== undefined || input.description !== undefined) {
    const existing = await db
      .select()
      .from(menuCategoryTranslations)
      .where(
        and(
          eq(menuCategoryTranslations.categoryId, categoryId),
          eq(menuCategoryTranslations.storeId, ctx.storeId),
          eq(menuCategoryTranslations.locale, locale),
        ),
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(menuCategoryTranslations)
        .set({
          name: input.name?.trim() ?? existing[0].name,
          description:
            input.description === undefined ? existing[0].description : input.description,
          source: 'manual',
          reviewStatus: 'reviewed',
          reviewedByUserId: ctx.userId,
          reviewedAt: updatedAt,
        })
        .where(eq(menuCategoryTranslations.id, existing[0].id));
    } else if (input.name) {
      const localeIssue = assertLocaleAllowed({
        plan: ctx.plan,
        baseLocale: await getBaseLocale(ctx, db),
        locale,
        existingLocales: await listMenuLocales(ctx, db),
      });
      if (localeIssue) {
        throw new MenuValidationError([localeIssue]);
      }
      await db.insert(menuCategoryTranslations).values({
        id: crypto.randomUUID(),
        storeId: ctx.storeId,
        categoryId,
        locale,
        name: input.name.trim(),
        description: input.description ?? null,
        source: 'manual',
        reviewStatus: 'reviewed',
        sourceGenerationId: null,
        reviewedByUserId: ctx.userId,
        reviewedAt: updatedAt,
      });
    }
  }

  return { categoryId };
}

export async function deleteCategory(ctx: StoreContext, db: Db, categoryId: string) {
  const existing = await db
    .select({ id: menuCategories.id })
    .from(menuCategories)
    .where(and(eq(menuCategories.id, categoryId), eq(menuCategories.storeId, ctx.storeId)))
    .limit(1);
  if (!existing[0]) {
    return false;
  }
  await db
    .delete(menuCategories)
    .where(and(eq(menuCategories.id, categoryId), eq(menuCategories.storeId, ctx.storeId)));
  return true;
}

export async function createItem(
  ctx: StoreContext,
  db: Db,
  input: {
    categoryId: string;
    name: string;
    description?: string;
    priceAmount: number;
    locale?: string;
  },
) {
  const category = await db
    .select()
    .from(menuCategories)
    .where(and(eq(menuCategories.id, input.categoryId), eq(menuCategories.storeId, ctx.storeId)))
    .limit(1);
  if (!category[0]) {
    return null;
  }

  const locale = input.locale ?? (await getBaseLocale(ctx, db));
  const localeIssue = assertLocaleAllowed({
    plan: ctx.plan,
    baseLocale: await getBaseLocale(ctx, db),
    locale,
    existingLocales: await listMenuLocales(ctx, db),
  });
  if (localeIssue) {
    throw new MenuValidationError([localeIssue]);
  }

  const createdAt = nowMs();
  const itemId = crypto.randomUUID();
  const siblings = await db
    .select({ sortOrder: menuItems.sortOrder })
    .from(menuItems)
    .where(and(eq(menuItems.storeId, ctx.storeId), eq(menuItems.categoryId, input.categoryId)));
  const sortOrder = (siblings.at(-1)?.sortOrder ?? -1) + 1;

  await db.insert(menuItems).values({
    id: itemId,
    storeId: ctx.storeId,
    categoryId: input.categoryId,
    priceAmount: input.priceAmount,
    imageKey: null,
    sortOrder,
    isAvailable: true,
    isSoldOut: false,
    createdAt,
    updatedAt: createdAt,
  });
  await db.insert(menuItemTranslations).values({
    id: crypto.randomUUID(),
    storeId: ctx.storeId,
    itemId,
    locale,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    source: 'manual',
    reviewStatus: 'reviewed',
    sourceGenerationId: null,
    reviewedByUserId: ctx.userId,
    reviewedAt: createdAt,
  });

  return { itemId };
}

export async function updateItem(
  ctx: StoreContext,
  db: Db,
  itemId: string,
  input: {
    name?: string;
    description?: string | null;
    priceAmount?: number;
    isAvailable?: boolean;
    isSoldOut?: boolean;
    sortOrder?: number;
    categoryId?: string;
    locale?: string;
  },
) {
  const rows = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.id, itemId), eq(menuItems.storeId, ctx.storeId)))
    .limit(1);
  if (!rows[0]) {
    return null;
  }

  if (input.categoryId) {
    const cat = await db
      .select({ id: menuCategories.id })
      .from(menuCategories)
      .where(and(eq(menuCategories.id, input.categoryId), eq(menuCategories.storeId, ctx.storeId)))
      .limit(1);
    if (!cat[0]) {
      return null;
    }
  }

  const updatedAt = nowMs();
  await db
    .update(menuItems)
    .set({
      priceAmount: input.priceAmount ?? rows[0].priceAmount,
      isAvailable: input.isAvailable ?? rows[0].isAvailable,
      isSoldOut: input.isSoldOut ?? rows[0].isSoldOut,
      sortOrder: input.sortOrder ?? rows[0].sortOrder,
      categoryId: input.categoryId ?? rows[0].categoryId,
      updatedAt,
    })
    .where(and(eq(menuItems.id, itemId), eq(menuItems.storeId, ctx.storeId)));

  const locale = input.locale ?? (await getBaseLocale(ctx, db));
  if (input.name !== undefined || input.description !== undefined) {
    const existing = await db
      .select()
      .from(menuItemTranslations)
      .where(
        and(
          eq(menuItemTranslations.itemId, itemId),
          eq(menuItemTranslations.storeId, ctx.storeId),
          eq(menuItemTranslations.locale, locale),
        ),
      )
      .limit(1);

    if (existing[0]) {
      await db
        .update(menuItemTranslations)
        .set({
          name: input.name?.trim() ?? existing[0].name,
          description:
            input.description === undefined ? existing[0].description : input.description,
          source: 'manual',
          reviewStatus: 'reviewed',
          reviewedByUserId: ctx.userId,
          reviewedAt: updatedAt,
        })
        .where(eq(menuItemTranslations.id, existing[0].id));
    } else if (input.name) {
      const localeIssue = assertLocaleAllowed({
        plan: ctx.plan,
        baseLocale: await getBaseLocale(ctx, db),
        locale,
        existingLocales: await listMenuLocales(ctx, db),
      });
      if (localeIssue) {
        throw new MenuValidationError([localeIssue]);
      }
      await db.insert(menuItemTranslations).values({
        id: crypto.randomUUID(),
        storeId: ctx.storeId,
        itemId,
        locale,
        name: input.name.trim(),
        description: input.description ?? null,
        source: 'manual',
        reviewStatus: 'reviewed',
        sourceGenerationId: null,
        reviewedByUserId: ctx.userId,
        reviewedAt: updatedAt,
      });
    }
  }

  return { itemId };
}

/** 仅由上传 API 写入；客户端不得直接 PATCH 任意 key。 */
export async function setItemImageKey(
  ctx: StoreContext,
  db: Db,
  itemId: string,
  imageKey: string | null,
): Promise<{ itemId: string; previousKey: string | null } | null> {
  const rows = await db
    .select({ id: menuItems.id, imageKey: menuItems.imageKey })
    .from(menuItems)
    .where(and(eq(menuItems.id, itemId), eq(menuItems.storeId, ctx.storeId)))
    .limit(1);
  if (!rows[0]) {
    return null;
  }
  const previousKey = rows[0].imageKey;
  await db
    .update(menuItems)
    .set({ imageKey, updatedAt: nowMs() })
    .where(and(eq(menuItems.id, itemId), eq(menuItems.storeId, ctx.storeId)));
  return { itemId, previousKey };
}

export async function deleteItem(ctx: StoreContext, db: Db, itemId: string) {
  const existing = await db
    .select({ id: menuItems.id })
    .from(menuItems)
    .where(and(eq(menuItems.id, itemId), eq(menuItems.storeId, ctx.storeId)))
    .limit(1);
  if (!existing[0]) {
    return false;
  }
  await db
    .delete(menuItems)
    .where(and(eq(menuItems.id, itemId), eq(menuItems.storeId, ctx.storeId)));
  return true;
}

const COPY_SUFFIXES: Record<string, string> = {
  en: ' (copy)',
  vi: ' (bản sao)',
  zh: '（副本）',
  ja: '（コピー）',
};

/** 复制菜品时按店主本次操作使用的界面语言追加后缀，并避免无限叠加。 */
export function duplicatedItemName(name: string, locale: string): string {
  const suffix = COPY_SUFFIXES[locale] ?? COPY_SUFFIXES.en;
  const existingSuffix = Object.values(COPY_SUFFIXES).find((candidate) =>
    name.endsWith(candidate),
  );
  const baseName = existingSuffix ? name.slice(0, -existingSuffix.length) : name;
  return `${baseName}${suffix}`;
}

/**
 * 复制菜品（含全部 locale 翻译与规格组）。售罄状态重置为可售。
 */
export async function duplicateItem(
  ctx: StoreContext,
  db: Db,
  itemId: string,
  copyLocale?: string,
) {
  const sourceRows = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.id, itemId), eq(menuItems.storeId, ctx.storeId)))
    .limit(1);
  const source = sourceRows[0];
  if (!source) {
    return null;
  }

  const translations = await db
    .select()
    .from(menuItemTranslations)
    .where(
      and(eq(menuItemTranslations.itemId, itemId), eq(menuItemTranslations.storeId, ctx.storeId)),
    );
  if (translations.length === 0) {
    return null;
  }

  const createdAt = nowMs();
  const newItemId = crypto.randomUUID();
  const siblings = await db
    .select({ sortOrder: menuItems.sortOrder })
    .from(menuItems)
    .where(and(eq(menuItems.storeId, ctx.storeId), eq(menuItems.categoryId, source.categoryId)));
  const sortOrder = (siblings.at(-1)?.sortOrder ?? -1) + 1;

  await db.insert(menuItems).values({
    id: newItemId,
    storeId: ctx.storeId,
    categoryId: source.categoryId,
    priceAmount: source.priceAmount,
    // 不共用 R2 key：避免删图时互相影响；用户可再上传
    imageKey: null,
    sortOrder,
    isAvailable: source.isAvailable,
    isSoldOut: false,
    createdAt,
    updatedAt: createdAt,
  });

  await db.insert(menuItemTranslations).values(
    translations.map((t) => ({
      id: crypto.randomUUID(),
      storeId: ctx.storeId,
      itemId: newItemId,
      locale: t.locale,
      name: duplicatedItemName(t.name, copyLocale ?? t.locale),
      description: t.description,
      source: 'manual' as const,
      reviewStatus: 'reviewed' as const,
      sourceGenerationId: null,
      reviewedByUserId: ctx.userId,
      reviewedAt: createdAt,
    })),
  );

  await copyModifiersToItem(ctx, db, itemId, newItemId);

  return { itemId: newItemId, categoryId: source.categoryId };
}

export async function batchUpdateItemAvailability(
  ctx: StoreContext,
  db: Db,
  input: { itemIds: string[]; isAvailable?: boolean; isSoldOut?: boolean },
) {
  if (input.isAvailable === undefined && input.isSoldOut === undefined) {
    return 0;
  }
  const updatedAt = nowMs();
  const patch: {
    isAvailable?: boolean;
    isSoldOut?: boolean;
    updatedAt: Date;
  } = { updatedAt };
  if (input.isAvailable !== undefined) patch.isAvailable = input.isAvailable;
  if (input.isSoldOut !== undefined) patch.isSoldOut = input.isSoldOut;

  const existing = await db
    .select({ id: menuItems.id })
    .from(menuItems)
    .where(and(eq(menuItems.storeId, ctx.storeId), inArray(menuItems.id, input.itemIds)));
  if (existing.length === 0) {
    return 0;
  }
  await db
    .update(menuItems)
    .set(patch)
    .where(
      and(
        eq(menuItems.storeId, ctx.storeId),
        inArray(
          menuItems.id,
          existing.map((row) => row.id),
        ),
      ),
    );
  return existing.length;
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

async function getBaseLocale(ctx: StoreContext, db: Db): Promise<string> {
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
