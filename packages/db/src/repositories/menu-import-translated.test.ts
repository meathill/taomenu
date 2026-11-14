import type { MenuImportOutput } from '@taomenu/shared';
import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { menuCategoryTranslations, menuItemTranslations } from '../schema/menu';
import { menuImports } from '../schema/menu-ai';
import { seedStore, seedUser } from '../testing/agent-fixtures';
import { createTestDb } from '../testing/memory-d1';
import type { Db, StoreContext } from '../types';
import { createMenuImport, getLatestMenuImport, getMenuImportUsage } from './menu-ai';
import {
  failMenuImport,
  markMenuImportProcessing,
  saveMenuImportResult,
} from './menu-ai-processing';
import { createCategory } from './menu-categories';
import { applyMenuImport, reviewMenuImport } from './menu-import-review';

const IMPORT_ID = '00000000-0000-4000-8000-000000000001';

function output(locale: string, category: string, item: string): MenuImportOutput {
  return {
    detectedLocale: locale,
    currency: 'VND',
    warnings: [],
    categories: [
      {
        name: category,
        description: null,
        confidence: 0.9,
        items: [
          {
            name: item,
            description: null,
            priceAmount: 35000,
            confidence: 0.9,
            modifierGroups: [],
          },
        ],
      },
    ],
  };
}

async function setup(plan: 'free' | 'pro'): Promise<{ db: Db; ctx: StoreContext }> {
  const db = createTestDb();
  await seedUser(db, 'owner-1', 'owner@example.com');
  await seedStore(db, 'store-1', { plan });
  const ctx: StoreContext = {
    storeId: 'store-1',
    userId: 'owner-1',
    role: 'owner',
    plan,
    staffSeatAddons: 0,
  };
  // 已有越南语菜单
  await createCategory(ctx, db, { name: 'Món chính' });
  await createMenuImport(ctx, db, {
    importId: IMPORT_ID,
    r2Key: 'menu-imports/store-1/1.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 4,
  });
  await db.update(menuImports).set({ status: 'queued' }).where(eq(menuImports.id, IMPORT_ID));
  await markMenuImportProcessing(db, IMPORT_ID);
  // 英文菜单识别后翻译成越南语，原文随建议保存
  await saveMenuImportResult(db, IMPORT_ID, output('vi', 'Đồ uống', 'Cà phê sữa'), null, {
    originalOutput: output('en', 'Drinks', 'Milk coffee'),
  });
  return { db, ctx };
}

async function acceptAllAndApply(db: Db, ctx: StoreContext) {
  const view = await getLatestMenuImport(ctx, db);
  await reviewMenuImport(ctx, db, IMPORT_ID, {
    suggestions: (view?.suggestions ?? []).map((suggestion) => ({
      id: suggestion.id,
      decision: 'accepted' as const,
    })),
  });
  return applyMenuImport(ctx, db, IMPORT_ID);
}

async function localesOf(db: Db, name: string) {
  const category = await db
    .select()
    .from(menuCategoryTranslations)
    .where(eq(menuCategoryTranslations.name, name));
  const categoryId = category[0]?.categoryId ?? '';
  const rows = await db
    .select({ locale: menuCategoryTranslations.locale, name: menuCategoryTranslations.name })
    .from(menuCategoryTranslations)
    .where(eq(menuCategoryTranslations.categoryId, categoryId));
  return rows.map((row) => `${row.locale}:${row.name}`).sort();
}

describe('另一种语言的菜单导入（issue #29）', () => {
  it('建议里是菜单语言的译文，并带上原文提示', async () => {
    const { db, ctx } = await setup('free');
    const view = await getLatestMenuImport(ctx, db);
    const item = view?.suggestions.find((suggestion) => suggestion.entityType === 'item');
    expect(item?.locale).toBe('vi');
    expect(item?.value).toMatchObject({
      name: 'Cà phê sữa',
      original: { locale: 'en', name: 'Milk coffee', description: null },
    });
  });

  it('Free：语言名额未满时原文一并保存为第二语言', async () => {
    const { db, ctx } = await setup('free');
    await expect(acceptAllAndApply(db, ctx)).resolves.toEqual({ applied: 2 });
    expect(await localesOf(db, 'Đồ uống')).toEqual(['en:Drinks', 'vi:Đồ uống']);
  });

  it('Pro：语言数允许时原文一并保存为第二语言', async () => {
    const { db, ctx } = await setup('pro');
    await acceptAllAndApply(db, ctx);
    expect(await localesOf(db, 'Đồ uống')).toEqual(['en:Drinks', 'vi:Đồ uống']);
    const items = await db
      .select({ locale: menuItemTranslations.locale, name: menuItemTranslations.name })
      .from(menuItemTranslations)
      .where(and(eq(menuItemTranslations.storeId, 'store-1')));
    expect(items.map((row) => `${row.locale}:${row.name}`).sort()).toEqual([
      'en:Milk coffee',
      'vi:Cà phê sữa',
    ]);
  });

  it('失败的导入不占用每月额度', async () => {
    const { db, ctx } = await setup('free');
    expect((await getMenuImportUsage(ctx, db)).used).toBe(1);
    await failMenuImport(db, IMPORT_ID, 'MIMO_HTTP_500');
    expect((await getMenuImportUsage(ctx, db)).used).toBe(0);
  });
});
