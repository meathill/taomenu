import type { MenuImportOutput } from '@taomenu/shared';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { menuImports } from '../schema/menu-ai';
import { seedStore, seedUser } from '../testing/agent-fixtures';
import { createTestDb } from '../testing/memory-d1';
import type { Db, StoreContext } from '../types';
import {
  createMenuImport,
  getLatestMenuImport,
  getMenuImportUsage,
  queueMenuImport,
} from './menu-ai';
import { markMenuImportProcessing, saveMenuImportResult } from './menu-ai-processing';
import { createCategory } from './menu-categories';
import { discardMenuImport } from './menu-import-discard';

const IMPORT_ID = '00000000-0000-4000-8000-000000000002';

const ENGLISH: MenuImportOutput = {
  detectedLocale: 'en',
  currency: 'VND',
  warnings: [],
  categories: [
    {
      name: 'Drinks',
      description: null,
      confidence: 0.9,
      items: [
        {
          name: 'Milk coffee',
          description: null,
          priceAmount: 35000,
          confidence: 0.9,
          modifierGroups: [],
        },
      ],
    },
  ],
};

async function setup(withMenu: boolean): Promise<{ db: Db; ctx: StoreContext }> {
  const db = createTestDb();
  await seedUser(db, 'owner-1', 'owner@example.com');
  await seedStore(db, 'store-1');
  const ctx: StoreContext = {
    storeId: 'store-1',
    userId: 'owner-1',
    role: 'owner',
    plan: 'free',
    staffSeatAddons: 0,
  };
  if (withMenu) await createCategory(ctx, db, { name: 'Món chính' });
  await createMenuImport(ctx, db, {
    importId: IMPORT_ID,
    r2Key: 'menu-imports/store-1/2.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 4,
  });
  return { db, ctx };
}

async function recognize(db: Db, ctx: StoreContext, output: MenuImportOutput) {
  await queueMenuImport(ctx, db, IMPORT_ID);
  await markMenuImportProcessing(db, IMPORT_ID);
  await saveMenuImportResult(db, IMPORT_ID, output, null);
}

describe('放弃导入草稿（issue #29）', () => {
  it('识别结果可以放弃，回到可上传状态；已经识别过的仍计入额度', async () => {
    const { db, ctx } = await setup(false);
    await recognize(db, ctx, ENGLISH);
    await expect(discardMenuImport(ctx, db, IMPORT_ID)).resolves.toEqual({ importId: IMPORT_ID });
    expect((await getLatestMenuImport(ctx, db))?.menuImport.status).toBe('cancelled');
    expect((await getMenuImportUsage(ctx, db)).used).toBe(1);
  });

  it('还没识别就放弃不占额度，重复放弃是幂等的', async () => {
    const { db, ctx } = await setup(false);
    await discardMenuImport(ctx, db, IMPORT_ID);
    await discardMenuImport(ctx, db, IMPORT_ID);
    expect((await getMenuImportUsage(ctx, db)).used).toBe(0);
  });

  it('不能放弃其他门店的导入，也不能放弃正在识别的导入', async () => {
    const { db, ctx } = await setup(false);
    await expect(
      discardMenuImport({ ...ctx, storeId: 'store-2' }, db, IMPORT_ID),
    ).resolves.toBeNull();
    await queueMenuImport(ctx, db, IMPORT_ID);
    await markMenuImportProcessing(db, IMPORT_ID);
    await expect(discardMenuImport(ctx, db, IMPORT_ID)).rejects.toMatchObject({
      code: 'INVALID_STATUS',
    });
  });
});

describe('无法写入的旧草稿自动作废（issue #29）', () => {
  it('已有越南语菜单 + 未翻译的英文草稿：读取时自动作废、退还额度、不可重试', async () => {
    const { db, ctx } = await setup(true);
    await recognize(db, ctx, ENGLISH);
    const view = await getLatestMenuImport(ctx, db);
    expect(view?.menuImport).toMatchObject({ status: 'failed', errorCode: 'LOCALE_MISMATCH' });
    expect((await getMenuImportUsage(ctx, db)).used).toBe(0);
    await expect(queueMenuImport(ctx, db, IMPORT_ID)).rejects.toMatchObject({
      code: 'INVALID_STATUS',
    });
  });

  it('菜单还是空的：草稿仍可写入（会改主语言），不作废', async () => {
    const { db, ctx } = await setup(false);
    await recognize(db, ctx, ENGLISH);
    expect((await getLatestMenuImport(ctx, db))?.menuImport.status).toBe('needs_review');
  });

  it('同语言草稿不受影响', async () => {
    const { db, ctx } = await setup(true);
    await recognize(db, ctx, { ...ENGLISH, detectedLocale: 'vi' });
    const status = (await getLatestMenuImport(ctx, db))?.menuImport.status;
    expect(status).toBe('needs_review');
    const rows = await db.select().from(menuImports).where(eq(menuImports.id, IMPORT_ID));
    expect(rows[0]?.errorCode).toBeNull();
  });
});
