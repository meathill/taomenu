import { getPlanLimits } from '@taomenu/shared';
import { describe, expect, it } from 'vitest';
import type { StoreContext } from '../types';
import { createMenuTranslation } from './menu-translation';

describe('AI 菜单翻译权益', () => {
  it('Free 在月度额度用尽后拒绝，而不再是 Pro 门禁', async () => {
    const ctx: StoreContext = {
      storeId: 'store-free',
      userId: 'owner-1',
      role: 'owner',
      plan: 'free',
      staffSeatAddons: 0,
    };
    const limit = getPlanLimits('free').maxAiTranslationsPerMonth;
    const db = {
      select: () => ({
        from: () => ({
          where: async () => [{ value: limit }],
        }),
      }),
    };
    await expect(createMenuTranslation(ctx, db as never, 'en')).rejects.toMatchObject({
      code: 'MONTHLY_LIMIT_REACHED',
    });
  });
});
