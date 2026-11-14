import type { MenuImportOutput } from '@taomenu/shared';
import { and, asc, eq } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { menuCategories } from '../schema/menu';
import { menuImportAssets, menuImportSuggestions, menuImports } from '../schema/menu-ai';
import { stores } from '../schema/stores';
import type { Db } from '../types';
import { MenuImportError } from './menu-ai-config';

/**
 * 一并带出门店币种、菜单语言和是否已有分类：AI worker 没有 StoreContext，
 * 识别提示词需要按币种生成；识别出的语言与已有菜单不同时需要先翻译（issue #29）
 */
export async function getMenuImportJob(db: Db, importId: string) {
  const rows = await db
    .select({
      menuImport: menuImports,
      storeCurrency: stores.currency,
      storeBaseLocale: stores.baseLocale,
    })
    .from(menuImports)
    .innerJoin(stores, eq(stores.id, menuImports.storeId))
    .where(eq(menuImports.id, importId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const assets = await db
    .select()
    .from(menuImportAssets)
    .where(eq(menuImportAssets.importId, importId))
    .orderBy(asc(menuImportAssets.pageOrder));
  const existingCategories = await db
    .select({ id: menuCategories.id })
    .from(menuCategories)
    .where(eq(menuCategories.storeId, row.menuImport.storeId))
    .limit(1);
  return {
    menuImport: row.menuImport,
    storeCurrency: row.storeCurrency,
    storeBaseLocale: row.storeBaseLocale,
    hasExistingCategories: existingCategories.length > 0,
    assets,
  };
}

export async function markMenuImportProcessing(db: Db, importId: string) {
  const result = await db
    .update(menuImports)
    .set({ status: 'processing', progress: 20, startedAt: new Date(), errorCode: null })
    .where(and(eq(menuImports.id, importId), eq(menuImports.status, 'queued')))
    .returning({ id: menuImports.id });
  return result.length > 0;
}

/** 识别原文（翻译前），与 output 结构一一对应；只保留分类和菜品的名称/描述作为审核提示与第二语言 */
export type MenuImportOriginal = { locale: string; name: string; description: string | null };

export async function saveMenuImportResult(
  db: Db,
  importId: string,
  output: MenuImportOutput,
  usage: unknown,
  options: { originalOutput?: MenuImportOutput } = {},
) {
  const originalOutput = options.originalOutput;
  function originalOf(categoryIndex: number, itemIndex?: number): MenuImportOriginal | null {
    const category = originalOutput?.categories[categoryIndex];
    if (!originalOutput || !category) return null;
    const source = itemIndex === undefined ? category : category.items[itemIndex];
    if (!source) return null;
    return {
      locale: originalOutput.detectedLocale,
      name: source.name,
      description: source.description,
    };
  }
  const job = await getMenuImportJob(db, importId);
  if (job?.menuImport.status !== 'processing') {
    throw new MenuImportError('INVALID_STATUS', 'Import is not processing');
  }
  const statements: BatchItem<'sqlite'>[] = [
    db.delete(menuImportSuggestions).where(eq(menuImportSuggestions.importId, importId)),
  ];
  for (const [categoryIndex, category] of output.categories.entries()) {
    const categoryTemporaryKey = crypto.randomUUID();
    statements.push(
      db.insert(menuImportSuggestions).values({
        id: crypto.randomUUID(),
        storeId: job.menuImport.storeId,
        importId,
        entityType: 'category',
        temporaryEntityKey: categoryTemporaryKey,
        fieldName: 'entity',
        locale: output.detectedLocale,
        suggestedValueJson: JSON.stringify({
          name: category.name,
          description: category.description,
          original: originalOf(categoryIndex),
        }),
        confidence: category.confidence,
        decision: 'pending',
        decidedByUserId: null,
        decidedAt: null,
      }),
    );
    for (const [itemIndex, item] of category.items.entries()) {
      statements.push(
        db.insert(menuImportSuggestions).values({
          id: crypto.randomUUID(),
          storeId: job.menuImport.storeId,
          importId,
          entityType: 'item',
          temporaryEntityKey: crypto.randomUUID(),
          fieldName: 'entity',
          locale: output.detectedLocale,
          suggestedValueJson: JSON.stringify({
            categoryTemporaryKey,
            name: item.name,
            description: item.description,
            priceAmount: item.priceAmount,
            modifierGroups: item.modifierGroups,
            original: originalOf(categoryIndex, itemIndex),
          }),
          confidence: item.confidence,
          decision: 'pending',
          decidedByUserId: null,
          decidedAt: null,
        }),
      );
    }
  }
  statements.push(
    db
      .update(menuImports)
      .set({
        status: 'needs_review',
        sourceLocale: output.detectedLocale,
        progress: 100,
        usageJson: JSON.stringify({
          usage,
          warnings: output.warnings,
          currency: output.currency,
          translatedFrom: originalOutput?.detectedLocale ?? null,
        }),
        completedAt: new Date(),
      })
      .where(eq(menuImports.id, importId)),
  );
  await db.batch(statements as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);
}

export async function failMenuImport(db: Db, importId: string, errorCode: string) {
  await db
    .update(menuImports)
    .set({ status: 'failed', progress: 100, errorCode, completedAt: new Date() })
    .where(eq(menuImports.id, importId));
}
