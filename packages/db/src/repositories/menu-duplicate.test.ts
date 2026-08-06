import { describe, expect, it } from 'vitest';
import type { StoreContext } from '../types';
import { batchUpdateItemAvailability, duplicatedItemName } from './menu';

describe('duplicatedItemName', () => {
  it('追加 sao chép 后缀', () => {
    expect(duplicatedItemName('Phở bò')).toBe('Phở bò (sao chép)');
  });

  it('已有后缀时不叠加', () => {
    expect(duplicatedItemName('Phở bò (sao chép)')).toBe('Phở bò (sao chép)');
  });
});

describe('batchUpdateItemAvailability', () => {
  it('未提供 isAvailable/isSoldOut 时不写库', async () => {
    const ctx: StoreContext = {
      storeId: 'store-a',
      userId: 'user-1',
      role: 'owner',
      plan: 'free',
      staffSeatAddons: 0,
    };
    const spyDb = {
      select: () => {
        throw new Error('不应查询数据库');
      },
      update: () => {
        throw new Error('不应更新数据库');
      },
    };

    const updated = await batchUpdateItemAvailability(ctx, spyDb as never, {
      itemIds: ['00000000-0000-4000-8000-000000000001'],
    });
    expect(updated).toBe(0);
  });
});
