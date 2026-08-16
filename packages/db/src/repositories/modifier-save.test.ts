import { describe, expect, it } from 'vitest';
import { user } from '../schema/auth';
import { createTestDb } from '../testing/memory-d1';
import type { StoreContext } from '../types';
import { createCategory } from './menu-categories';
import { createItem } from './menu-items';
import { reorderModifierGroups, saveModifierGroup } from './modifier-save';
import { loadModifierGroupsForItems } from './modifiers';
import { createStoreForOwner } from './stores';

async function setup() {
  const db = createTestDb();
  await db.insert(user).values({
    id: 'owner-1',
    name: 'Owner',
    email: 'owner@example.com',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const store = await createStoreForOwner(db, 'owner-1', {
    name: 'Test store',
    serviceMode: 'table_service',
    baseLocale: 'vi',
  });
  const ctx: StoreContext = {
    storeId: store.id,
    userId: 'owner-1',
    role: 'owner',
    plan: 'free',
    staffSeatAddons: 0,
  };
  const category = await createCategory(ctx, db, { name: 'Món chính', locale: 'vi' });
  const item = await createItem(ctx, db, {
    categoryId: category.categoryId,
    name: 'Phở',
    priceAmount: 45_000,
    locale: 'vi',
  });
  return { db, ctx, itemId: item!.itemId };
}

describe('一次保存规格组', () => {
  it('创建组时可同时写入多个选项，空加价为 0', async () => {
    const { db, ctx, itemId } = await setup();
    const saved = await saveModifierGroup(ctx, db, {
      itemId,
      name: 'Cay',
      isRequired: true,
      locale: 'vi',
      options: [{ name: 'Không cay' }, { name: 'Cay vừa', priceDeltaAmount: 5000 }],
    });
    expect(saved?.optionIds).toHaveLength(2);

    const groups = (await loadModifierGroupsForItems(db, ctx.storeId, [itemId])).get(itemId) ?? [];
    expect(groups).toHaveLength(1);
    expect(groups[0]?.options.map((option) => option.priceDeltaAmount)).toEqual([0, 5000]);
  });

  it('再次保存会更新、新增并删除选项', async () => {
    const { db, ctx, itemId } = await setup();
    const created = await saveModifierGroup(ctx, db, {
      itemId,
      name: 'Cay',
      locale: 'vi',
      options: [{ name: 'Không cay' }, { name: 'Cay vừa', priceDeltaAmount: 5000 }],
    });

    const firstId = created!.optionIds[0]!;
    await saveModifierGroup(ctx, db, {
      groupId: created!.groupId,
      name: 'Độ cay',
      locale: 'vi',
      options: [
        { id: firstId, name: 'Nhẹ' },
        { name: 'Cay nhiều', priceDeltaAmount: 8000 },
      ],
    });

    const groups = (await loadModifierGroupsForItems(db, ctx.storeId, [itemId])).get(itemId) ?? [];
    expect(groups[0]?.translations[0]?.name).toBe('Độ cay');
    expect(groups[0]?.options.map((option) => option.translations[0]?.name)).toEqual([
      'Nhẹ',
      'Cay nhiều',
    ]);
    expect(groups[0]?.options.map((option) => option.id)).toEqual([
      firstId,
      groups[0]?.options[1]?.id,
    ]);
  });

  it('按传入顺序重排规格组', async () => {
    const { db, ctx, itemId } = await setup();
    const first = await saveModifierGroup(ctx, db, {
      itemId,
      name: 'Size',
      locale: 'vi',
      options: [{ name: 'M' }],
    });
    const second = await saveModifierGroup(ctx, db, {
      itemId,
      name: 'Cay',
      locale: 'vi',
      options: [{ name: 'Cay' }],
    });

    const ok = await reorderModifierGroups(ctx, db, itemId, [second!.groupId, first!.groupId]);
    expect(ok).toBe(true);

    const groups = (await loadModifierGroupsForItems(db, ctx.storeId, [itemId])).get(itemId) ?? [];
    expect(groups.map((group) => group.id)).toEqual([second!.groupId, first!.groupId]);
  });

  it('重排 id 不完整时拒绝', async () => {
    const { db, ctx, itemId } = await setup();
    const saved = await saveModifierGroup(ctx, db, {
      itemId,
      name: 'Size',
      locale: 'vi',
      options: [{ name: 'M' }],
    });
    expect(await reorderModifierGroups(ctx, db, itemId, [])).toBe(false);
    expect(
      await reorderModifierGroups(ctx, db, itemId, [
        saved!.groupId,
        '00000000-0000-4000-8000-000000000099',
      ]),
    ).toBe(false);
  });
});
