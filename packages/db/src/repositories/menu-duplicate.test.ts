import { describe, expect, it } from 'vitest';
import type { StoreContext } from '../types';
import { batchUpdateItemAvailability, duplicatedItemName } from './menu';

describe('duplicatedItemName', () => {
  it('按本次操作指定的界面语言追加复制后缀', () => {
    expect(duplicatedItemName('Phở bò', 'vi')).toBe('Phở bò (bản sao)');
    expect(duplicatedItemName('Rice', 'en')).toBe('Rice (copy)');
    expect(duplicatedItemName('米饭', 'zh')).toBe('米饭（副本）');
    expect(duplicatedItemName('ご飯', 'ja')).toBe('ご飯（コピー）');
  });

  it('已有后缀时替换为本次操作语言而不是叠加', () => {
    expect(duplicatedItemName('Phở bò (bản sao)', 'vi')).toBe('Phở bò (bản sao)');
    expect(duplicatedItemName('米饭 (bản sao)', 'zh')).toBe('米饭（副本）');
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
