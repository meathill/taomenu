import { describe, expect, it } from 'vitest';
import type { StoreContext } from '../types';
import { createMenuTranslation } from './menu-translation';

describe('AI 菜单翻译权益', () => {
  it('Free 门店在查询菜单前被拒绝', async () => {
    const ctx: StoreContext = {
      storeId: 'store-free',
      userId: 'owner-1',
      role: 'owner',
      plan: 'free',
      staffSeatAddons: 0,
    };
    const db = {
      select: () => {
        throw new Error('Free 门店不应查询翻译输入');
      },
    };
    await expect(createMenuTranslation(ctx, db as never, 'en')).rejects.toMatchObject({
      code: 'PRO_REQUIRED',
    });
  });
});
