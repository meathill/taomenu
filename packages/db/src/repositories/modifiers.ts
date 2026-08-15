import { and, asc, eq, inArray } from 'drizzle-orm';
import { assertLocaleAllowed } from '../menu-publish';
import {
  menuItems,
  modifierGroups,
  modifierGroupTranslations,
  modifiers,
  modifierTranslations,
} from '../schema/menu';
import { nowMs } from '../time';
import type { Db, StoreContext } from '../types';
import { getBaseLocale, listMenuLocales, MenuValidationError } from './menu';

async function assertModifierLocaleAllowed(ctx: StoreContext, db: Db, locale: string) {
  const baseLocale = await getBaseLocale(ctx, db);
  const issue = assertLocaleAllowed({
    plan: ctx.plan,
    baseLocale,
    locale,
    existingLocales: await listMenuLocales(ctx, db),
  });
  if (issue) throw new MenuValidationError([issue]);
}

export type MenuModifierOption = {
  id: string;
  priceDeltaAmount: number;
  sortOrder: number;
  isAvailable: boolean;
  translations: Array<{ locale: string; name: string }>;
};

export type MenuModifierGroup = {
  id: string;
  minSelected: number;
  maxSelected: number;
  sortOrder: number;
  isRequired: boolean;
  translations: Array<{ locale: string; name: string }>;
  options: MenuModifierOption[];
};

/** 批量加载菜品规格树（owner / public 共用）。 */
export async function loadModifierGroupsForItems(
  db: Db,
  storeId: string,
  itemIds: string[],
): Promise<Map<string, MenuModifierGroup[]>> {
  const result = new Map<string, MenuModifierGroup[]>();
  if (itemIds.length === 0) return result;

  const groups = await db
    .select()
    .from(modifierGroups)
    .where(and(eq(modifierGroups.storeId, storeId), inArray(modifierGroups.itemId, itemIds)))
    .orderBy(asc(modifierGroups.sortOrder));

  if (groups.length === 0) return result;

  const groupIds = groups.map((g) => g.id);
  const groupTr = await db
    .select()
    .from(modifierGroupTranslations)
    .where(
      and(
        eq(modifierGroupTranslations.storeId, storeId),
        inArray(modifierGroupTranslations.modifierGroupId, groupIds),
      ),
    );

  const options = await db
    .select()
    .from(modifiers)
    .where(and(eq(modifiers.storeId, storeId), inArray(modifiers.modifierGroupId, groupIds)))
    .orderBy(asc(modifiers.sortOrder));

  const optionIds = options.map((o) => o.id);
  const optionTr =
    optionIds.length === 0
      ? []
      : await db
          .select()
          .from(modifierTranslations)
          .where(
            and(
              eq(modifierTranslations.storeId, storeId),
              inArray(modifierTranslations.modifierId, optionIds),
            ),
          );

  for (const group of groups) {
    const view: MenuModifierGroup = {
      id: group.id,
      minSelected: group.minSelected,
      maxSelected: group.maxSelected,
      sortOrder: group.sortOrder,
      isRequired: group.isRequired,
      translations: groupTr
        .filter((t) => t.modifierGroupId === group.id)
        .map((t) => ({ locale: t.locale, name: t.name })),
      options: options
        .filter((o) => o.modifierGroupId === group.id)
        .map((o) => ({
          id: o.id,
          priceDeltaAmount: o.priceDeltaAmount,
          sortOrder: o.sortOrder,
          isAvailable: o.isAvailable,
          translations: optionTr
            .filter((t) => t.modifierId === o.id)
            .map((t) => ({ locale: t.locale, name: t.name })),
        })),
    };
    const list = result.get(group.itemId) ?? [];
    list.push(view);
    result.set(group.itemId, list);
  }

  return result;
}

export async function createModifierGroup(
  ctx: StoreContext,
  db: Db,
  input: {
    itemId: string;
    name: string;
    isRequired?: boolean;
    minSelected?: number;
    maxSelected?: number;
    locale?: string;
  },
) {
  const item = await db
    .select({ id: menuItems.id })
    .from(menuItems)
    .where(and(eq(menuItems.id, input.itemId), eq(menuItems.storeId, ctx.storeId)))
    .limit(1);
  if (!item[0]) return null;

  const isRequired = input.isRequired ?? false;
  let minSelected = input.minSelected ?? (isRequired ? 1 : 0);
  let maxSelected = input.maxSelected ?? 1;
  if (isRequired && minSelected < 1) minSelected = 1;
  if (maxSelected < minSelected) maxSelected = minSelected;

  const siblings = await db
    .select({ sortOrder: modifierGroups.sortOrder })
    .from(modifierGroups)
    .where(and(eq(modifierGroups.storeId, ctx.storeId), eq(modifierGroups.itemId, input.itemId)));
  const sortOrder = (siblings.at(-1)?.sortOrder ?? -1) + 1;
  const groupId = crypto.randomUUID();
  const locale = input.locale ?? (await getBaseLocale(ctx, db));
  await assertModifierLocaleAllowed(ctx, db, locale);

  await db.insert(modifierGroups).values({
    id: groupId,
    storeId: ctx.storeId,
    itemId: input.itemId,
    minSelected,
    maxSelected,
    sortOrder,
    isRequired,
  });
  await db.insert(modifierGroupTranslations).values({
    id: crypto.randomUUID(),
    storeId: ctx.storeId,
    modifierGroupId: groupId,
    locale,
    name: input.name.trim(),
  });

  return { groupId };
}

export async function updateModifierGroup(
  ctx: StoreContext,
  db: Db,
  groupId: string,
  input: {
    name?: string;
    isRequired?: boolean;
    minSelected?: number;
    maxSelected?: number;
    locale?: string;
  },
) {
  const rows = await db
    .select()
    .from(modifierGroups)
    .where(and(eq(modifierGroups.id, groupId), eq(modifierGroups.storeId, ctx.storeId)))
    .limit(1);
  if (!rows[0]) return null;

  let minSelected = input.minSelected ?? rows[0].minSelected;
  let maxSelected = input.maxSelected ?? rows[0].maxSelected;
  const isRequired = input.isRequired ?? rows[0].isRequired;
  if (isRequired && minSelected < 1) minSelected = 1;
  if (maxSelected < minSelected) maxSelected = minSelected;

  await db
    .update(modifierGroups)
    .set({ minSelected, maxSelected, isRequired })
    .where(and(eq(modifierGroups.id, groupId), eq(modifierGroups.storeId, ctx.storeId)));

  if (input.name !== undefined) {
    const locale = input.locale ?? (await getBaseLocale(ctx, db));
    const existing = await db
      .select()
      .from(modifierGroupTranslations)
      .where(
        and(
          eq(modifierGroupTranslations.modifierGroupId, groupId),
          eq(modifierGroupTranslations.storeId, ctx.storeId),
          eq(modifierGroupTranslations.locale, locale),
        ),
      )
      .limit(1);
    if (existing[0]) {
      await db
        .update(modifierGroupTranslations)
        .set({ name: input.name.trim() })
        .where(eq(modifierGroupTranslations.id, existing[0].id));
    } else {
      await assertModifierLocaleAllowed(ctx, db, locale);
      await db.insert(modifierGroupTranslations).values({
        id: crypto.randomUUID(),
        storeId: ctx.storeId,
        modifierGroupId: groupId,
        locale,
        name: input.name.trim(),
      });
    }
  }

  return { groupId };
}

export async function deleteModifierGroup(ctx: StoreContext, db: Db, groupId: string) {
  const existing = await db
    .select({ id: modifierGroups.id })
    .from(modifierGroups)
    .where(and(eq(modifierGroups.id, groupId), eq(modifierGroups.storeId, ctx.storeId)))
    .limit(1);
  if (!existing[0]) return false;
  await db
    .delete(modifierGroups)
    .where(and(eq(modifierGroups.id, groupId), eq(modifierGroups.storeId, ctx.storeId)));
  return true;
}

export async function createModifier(
  ctx: StoreContext,
  db: Db,
  input: {
    groupId: string;
    name: string;
    priceDeltaAmount?: number;
    locale?: string;
  },
) {
  const group = await db
    .select()
    .from(modifierGroups)
    .where(and(eq(modifierGroups.id, input.groupId), eq(modifierGroups.storeId, ctx.storeId)))
    .limit(1);
  if (!group[0]) return null;

  const siblings = await db
    .select({ sortOrder: modifiers.sortOrder })
    .from(modifiers)
    .where(and(eq(modifiers.storeId, ctx.storeId), eq(modifiers.modifierGroupId, input.groupId)));
  const sortOrder = (siblings.at(-1)?.sortOrder ?? -1) + 1;
  const modifierId = crypto.randomUUID();
  const locale = input.locale ?? (await getBaseLocale(ctx, db));
  await assertModifierLocaleAllowed(ctx, db, locale);
  const reviewedAt = nowMs();

  await db.insert(modifiers).values({
    id: modifierId,
    storeId: ctx.storeId,
    modifierGroupId: input.groupId,
    priceDeltaAmount: input.priceDeltaAmount ?? 0,
    sortOrder,
    isAvailable: true,
  });
  await db.insert(modifierTranslations).values({
    id: crypto.randomUUID(),
    storeId: ctx.storeId,
    modifierId,
    locale,
    name: input.name.trim(),
    source: 'manual',
    reviewStatus: 'reviewed',
    sourceGenerationId: null,
    reviewedByUserId: ctx.userId,
    reviewedAt,
  });

  return { modifierId };
}

export async function updateModifier(
  ctx: StoreContext,
  db: Db,
  modifierId: string,
  input: {
    name?: string;
    priceDeltaAmount?: number;
    isAvailable?: boolean;
    locale?: string;
  },
) {
  const rows = await db
    .select()
    .from(modifiers)
    .where(and(eq(modifiers.id, modifierId), eq(modifiers.storeId, ctx.storeId)))
    .limit(1);
  if (!rows[0]) return null;

  await db
    .update(modifiers)
    .set({
      priceDeltaAmount: input.priceDeltaAmount ?? rows[0].priceDeltaAmount,
      isAvailable: input.isAvailable ?? rows[0].isAvailable,
    })
    .where(and(eq(modifiers.id, modifierId), eq(modifiers.storeId, ctx.storeId)));

  if (input.name !== undefined) {
    const locale = input.locale ?? (await getBaseLocale(ctx, db));
    const existing = await db
      .select()
      .from(modifierTranslations)
      .where(
        and(
          eq(modifierTranslations.modifierId, modifierId),
          eq(modifierTranslations.storeId, ctx.storeId),
          eq(modifierTranslations.locale, locale),
        ),
      )
      .limit(1);
    const reviewedAt = nowMs();
    if (existing[0]) {
      await db
        .update(modifierTranslations)
        .set({
          name: input.name.trim(),
          source: 'manual',
          reviewStatus: 'reviewed',
          reviewedByUserId: ctx.userId,
          reviewedAt,
        })
        .where(eq(modifierTranslations.id, existing[0].id));
    } else {
      await assertModifierLocaleAllowed(ctx, db, locale);
      await db.insert(modifierTranslations).values({
        id: crypto.randomUUID(),
        storeId: ctx.storeId,
        modifierId,
        locale,
        name: input.name.trim(),
        source: 'manual',
        reviewStatus: 'reviewed',
        sourceGenerationId: null,
        reviewedByUserId: ctx.userId,
        reviewedAt,
      });
    }
  }

  return { modifierId };
}

export async function deleteModifier(ctx: StoreContext, db: Db, modifierId: string) {
  const existing = await db
    .select({ id: modifiers.id })
    .from(modifiers)
    .where(and(eq(modifiers.id, modifierId), eq(modifiers.storeId, ctx.storeId)))
    .limit(1);
  if (!existing[0]) return false;
  await db
    .delete(modifiers)
    .where(and(eq(modifiers.id, modifierId), eq(modifiers.storeId, ctx.storeId)));
  return true;
}

/** 将源菜品的规格组/选项复制到目标菜品。 */
export async function copyModifiersToItem(
  ctx: StoreContext,
  db: Db,
  sourceItemId: string,
  targetItemId: string,
) {
  const map = await loadModifierGroupsForItems(db, ctx.storeId, [sourceItemId]);
  const groups = map.get(sourceItemId) ?? [];
  for (const group of groups) {
    // 菜单内容语言归 baseLocale 管，与 UI locale 体系无关；仅在源数据无 translations 时兜底
    const groupName = group.translations[0]?.name ?? 'Tùy chọn';
    const created = await createModifierGroup(ctx, db, {
      itemId: targetItemId,
      name: groupName,
      isRequired: group.isRequired,
      minSelected: group.minSelected,
      maxSelected: group.maxSelected,
      locale: group.translations[0]?.locale,
    });
    if (!created) continue;
    for (const option of group.options) {
      const name = option.translations[0]?.name ?? '—';
      const createdOpt = await createModifier(ctx, db, {
        groupId: created.groupId,
        name,
        priceDeltaAmount: option.priceDeltaAmount,
        locale: option.translations[0]?.locale,
      });
      if (createdOpt && !option.isAvailable) {
        await updateModifier(ctx, db, createdOpt.modifierId, { isAvailable: false });
      }
    }
  }
}
