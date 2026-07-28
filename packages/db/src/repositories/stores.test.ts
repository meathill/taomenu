import { describe, expect, it } from 'vitest';
import type { StoreContext } from '../types';
import { getStoreIfMatches } from './stores';

describe('getStoreIfMatches', () => {
  it('路径 storeId 与上下文不一致时直接 null，不查库', async () => {
    const ctx: StoreContext = {
      storeId: 'store-a',
      userId: 'user-1',
      role: 'owner',
      plan: 'free',
    };

    const spyDb = {
      select: () => {
        throw new Error('不应查询数据库');
      },
    };

    const result = await getStoreIfMatches(ctx, spyDb as never, 'store-b');
    expect(result).toBeNull();
  });
});
