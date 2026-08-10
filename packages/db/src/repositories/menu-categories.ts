import { and, asc, eq } from 'drizzle-orm';
import { assertLocaleAllowed } from '../menu-publish';
import { menuCategories, menuCategoryTranslations } from '../schema/menu';
import { nowMs } from '../time';
import type { Db, StoreContext } from '../types';
import { ensureStoreMenu, getBaseLocale, listMenuLocales, MenuValidationError } from './menu';

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
