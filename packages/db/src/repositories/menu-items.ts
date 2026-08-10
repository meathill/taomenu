import { and, eq, inArray } from 'drizzle-orm';
import { assertLocaleAllowed } from '../menu-publish';
import { menuCategories, menuItems, menuItemTranslations } from '../schema/menu';
import { nowMs } from '../time';
import type { Db, StoreContext } from '../types';
import { getBaseLocale, listMenuLocales, MenuValidationError } from './menu';
import { copyModifiersToItem } from './modifiers';

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
  const existingSuffix = Object.values(COPY_SUFFIXES).find((candidate) => name.endsWith(candidate));
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
