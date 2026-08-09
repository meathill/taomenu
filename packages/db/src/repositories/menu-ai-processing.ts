import type { MenuImportOutput } from '@taomenu/shared';
import { and, asc, eq } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { menuImportAssets, menuImportSuggestions, menuImports } from '../schema/menu-ai';
import type { Db } from '../types';
import { MenuImportError } from './menu-ai-config';

export async function getMenuImportJob(db: Db, importId: string) {
  const imports = await db.select().from(menuImports).where(eq(menuImports.id, importId)).limit(1);
  const menuImport = imports[0];
  if (!menuImport) return null;
  const assets = await db
    .select()
    .from(menuImportAssets)
    .where(eq(menuImportAssets.importId, importId))
    .orderBy(asc(menuImportAssets.pageOrder));
  return { menuImport, assets };
}

export async function markMenuImportProcessing(db: Db, importId: string) {
  const result = await db
    .update(menuImports)
    .set({ status: 'processing', progress: 20, startedAt: new Date(), errorCode: null })
    .where(and(eq(menuImports.id, importId), eq(menuImports.status, 'queued')))
    .returning({ id: menuImports.id });
  return result.length > 0;
}

export async function saveMenuImportResult(
  db: Db,
  importId: string,
  output: MenuImportOutput,
  usage: unknown,
) {
  const job = await getMenuImportJob(db, importId);
  if (job?.menuImport.status !== 'processing') {
    throw new MenuImportError('INVALID_STATUS', 'Import is not processing');
  }
  const statements: BatchItem<'sqlite'>[] = [
    db.delete(menuImportSuggestions).where(eq(menuImportSuggestions.importId, importId)),
  ];
  for (const category of output.categories) {
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
        }),
        confidence: category.confidence,
        decision: 'pending',
        decidedByUserId: null,
        decidedAt: null,
      }),
    );
    for (const item of category.items) {
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
        usageJson: JSON.stringify({ usage, warnings: output.warnings, currency: output.currency }),
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
