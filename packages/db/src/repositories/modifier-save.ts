import { and, eq } from 'drizzle-orm';
import { modifierGroups, modifiers } from '../schema/menu';
import type { Db, StoreContext } from '../types';
import {
  createModifier,
  createModifierGroup,
  deleteModifier,
  updateModifier,
  updateModifierGroup,
} from './modifiers';

export type ModifierOptionSaveInput = {
  id?: string;
  name: string;
  priceDeltaAmount?: number;
};

export async function saveModifierGroup(
  ctx: StoreContext,
  db: Db,
  input: {
    itemId?: string;
    groupId?: string;
    name?: string;
    isRequired?: boolean;
    minSelected?: number;
    maxSelected?: number;
    sortOrder?: number;
    locale?: string;
    options: ModifierOptionSaveInput[];
  },
) {
  let groupId = input.groupId;
  if (groupId) {
    const updated = await updateModifierGroup(ctx, db, groupId, {
      name: input.name,
      isRequired: input.isRequired,
      minSelected: input.minSelected,
      maxSelected: input.maxSelected,
      sortOrder: input.sortOrder,
      locale: input.locale,
    });
    if (!updated) return null;
  } else if (input.itemId && input.name) {
    const created = await createModifierGroup(ctx, db, {
      itemId: input.itemId,
      name: input.name,
      isRequired: input.isRequired,
      minSelected: input.minSelected,
      maxSelected: input.maxSelected,
      sortOrder: input.sortOrder,
      locale: input.locale,
    });
    if (!created) return null;
    groupId = created.groupId;
  } else {
    return null;
  }

  const existing = await db
    .select({ id: modifiers.id })
    .from(modifiers)
    .where(and(eq(modifiers.storeId, ctx.storeId), eq(modifiers.modifierGroupId, groupId)));
  const existingIds = new Set(existing.map((row) => row.id));
  const incomingIds = new Set(
    input.options.flatMap((option) => (option.id && existingIds.has(option.id) ? [option.id] : [])),
  );

  for (const row of existing) {
    if (!incomingIds.has(row.id)) {
      await deleteModifier(ctx, db, row.id);
    }
  }

  const optionIds: string[] = [];
  for (const [index, option] of input.options.entries()) {
    if (option.id && existingIds.has(option.id)) {
      const updated = await updateModifier(ctx, db, option.id, {
        name: option.name,
        priceDeltaAmount: option.priceDeltaAmount ?? 0,
        sortOrder: index,
        locale: input.locale,
      });
      if (!updated) return null;
      optionIds.push(option.id);
      continue;
    }
    const created = await createModifier(ctx, db, {
      groupId,
      name: option.name,
      priceDeltaAmount: option.priceDeltaAmount ?? 0,
      sortOrder: index,
      locale: input.locale,
    });
    if (!created) return null;
    optionIds.push(created.modifierId);
  }

  return { groupId, optionIds };
}

export async function reorderModifierGroups(
  ctx: StoreContext,
  db: Db,
  itemId: string,
  orderedIds: string[],
) {
  const rows = await db
    .select({ id: modifierGroups.id })
    .from(modifierGroups)
    .where(and(eq(modifierGroups.storeId, ctx.storeId), eq(modifierGroups.itemId, itemId)));
  const existing = new Set(rows.map((row) => row.id));
  if (orderedIds.length !== existing.size || orderedIds.some((id) => !existing.has(id))) {
    return false;
  }

  for (const [index, groupId] of orderedIds.entries()) {
    await db
      .update(modifierGroups)
      .set({ sortOrder: index })
      .where(and(eq(modifierGroups.id, groupId), eq(modifierGroups.storeId, ctx.storeId)));
  }
  return true;
}
