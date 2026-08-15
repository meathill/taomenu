import { describe, expect, it } from 'vitest';
import { user } from '../schema/auth';
import { createTestDb } from '../testing/memory-d1';
import type { StoreContext } from '../types';
import { createCategory } from './menu-categories';
import { createItem } from './menu-items';
import { createModifierGroup } from './modifiers';
import { createStoreForOwner } from './stores';

describe('规格翻译语言额度', () => {
  it('Free 账号不能只通过规格接口创建第二语言', async () => {
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
      name: 'Cơm',
      priceAmount: 20_000,
      locale: 'vi',
    });

    await expect(
      createModifierGroup(ctx, db, {
        itemId: item!.itemId,
        name: 'Size',
        locale: 'en',
      }),
    ).rejects.toMatchObject({ name: 'MenuValidationError' });
  });
});
