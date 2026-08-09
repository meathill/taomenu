import { describe, expect, it } from 'vitest';
import type { StoreContext } from '../types';
import { createMenuImport } from './menu-ai';
import type { MenuImportError } from './menu-ai-config';

describe('AI 菜单导入权益', () => {
  it('Free 门店在任何数据库或 R2 记录写入前被服务端拒绝', async () => {
    const ctx: StoreContext = {
      storeId: 'store-free',
      userId: 'owner-1',
      role: 'owner',
      plan: 'free',
      staffSeatAddons: 0,
    };
    const db = {
      batch: () => {
        throw new Error('Free 门店不应写入数据库');
      },
    };

    await expect(
      createMenuImport(ctx, db as never, {
        importId: '00000000-0000-4000-8000-000000000001',
        r2Key: 'menu-imports/store-free/test.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 4,
      }),
    ).rejects.toMatchObject({ code: 'PRO_REQUIRED' } satisfies Partial<MenuImportError>);
  });
});
