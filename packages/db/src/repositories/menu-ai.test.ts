import { FREE_AI_MENU_IMPORTS_PER_MONTH } from '@taomenu/shared';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { menuImports } from '../schema/menu-ai';
import { seedStore, seedUser } from '../testing/agent-fixtures';
import { createTestDb } from '../testing/memory-d1';
import type { StoreContext } from '../types';
import { createMenuImport, getMenuImportUsage } from './menu-ai';
import type { MenuImportError } from './menu-ai-config';

function ctxFor(storeId: string, plan: 'free' | 'pro'): StoreContext {
  return { storeId, userId: 'owner-1', role: 'owner', plan, staffSeatAddons: 0 };
}

function importInput(n: number) {
  return {
    importId: `00000000-0000-4000-8000-00000000000${n}`,
    r2Key: `menu-imports/store/${n}.jpg`,
    mimeType: 'image/jpeg',
    sizeBytes: 4,
  };
}

describe('AI 菜单导入权益（issue #25）', () => {
  it('Free 门店可导入，走 MiMo，并受每月次数限制', async () => {
    const db = createTestDb();
    await seedUser(db, 'owner-1', 'owner@example.com');
    await seedStore(db, 'store-free', { plan: 'free' });
    const ctx = ctxFor('store-free', 'free');

    for (let n = 1; n <= FREE_AI_MENU_IMPORTS_PER_MONTH; n += 1) {
      await createMenuImport(ctx, db, importInput(n));
    }
    const rows = await db.select().from(menuImports).where(eq(menuImports.storeId, 'store-free'));
    expect(rows.map((row) => [row.provider, row.model])).toEqual(
      Array(FREE_AI_MENU_IMPORTS_PER_MONTH).fill(['mimo', 'mimo-v2.6-flash']),
    );
    expect(await getMenuImportUsage(ctx, db)).toEqual({
      used: FREE_AI_MENU_IMPORTS_PER_MONTH,
      limit: FREE_AI_MENU_IMPORTS_PER_MONTH,
    });
    await expect(createMenuImport(ctx, db, importInput(9))).rejects.toMatchObject({
      code: 'MONTHLY_LIMIT_REACHED',
    } satisfies Partial<MenuImportError>);
  });

  it('Pro 门店同样走 MiMo（issue #28）', async () => {
    const db = createTestDb();
    await seedUser(db, 'owner-1', 'owner@example.com');
    await seedStore(db, 'store-pro', { plan: 'pro' });
    await createMenuImport(ctxFor('store-pro', 'pro'), db, importInput(1));
    const rows = await db.select().from(menuImports);
    expect(rows[0]).toMatchObject({ provider: 'mimo', model: 'mimo-v2.6-flash' });
  });
});
