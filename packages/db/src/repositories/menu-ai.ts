import { getPlanLimits } from '@taomenu/shared';
import { and, asc, count, desc, eq, gte } from 'drizzle-orm';
import { assertPlanFeature } from '../plan-features';
import { menuCategories } from '../schema/menu';
import { menuImportAssets, menuImportSuggestions, menuImports } from '../schema/menu-ai';
import { currentUtcMonthStart } from '../time';
import type { Db, StoreContext } from '../types';
import {
  MENU_AI_MODEL,
  MENU_AI_PROMPT_VERSION,
  MENU_AI_PROVIDER,
  MENU_AI_SCHEMA_VERSION,
  MenuImportError,
} from './menu-ai-config';
import { parseSuggestionRow } from './menu-import-review';

export async function getMenuImportUsage(ctx: StoreContext, db: Db) {
  assertPlanFeature(ctx, 'canUseAiMenuImport', 'AI menu import requires Pro');
  const limit = getPlanLimits(ctx.plan).maxAiMenuImportsPerMonth;
  const rows = await db
    .select({ value: count() })
    .from(menuImports)
    .where(
      and(eq(menuImports.storeId, ctx.storeId), gte(menuImports.createdAt, currentUtcMonthStart())),
    );
  return { used: rows[0]?.value ?? 0, limit };
}

export async function createMenuImport(
  ctx: StoreContext,
  db: Db,
  input: { importId?: string; r2Key: string; mimeType: string; sizeBytes: number },
) {
  assertPlanFeature(ctx, 'canUseAiMenuImport', 'AI menu import requires Pro');
  const usage = await getMenuImportUsage(ctx, db);
  if (usage.used >= usage.limit) {
    throw new MenuImportError('MONTHLY_LIMIT_REACHED', 'Monthly AI menu import limit reached');
  }

  const importId = input.importId ?? crypto.randomUUID();
  const createdAt = new Date();
  await db.batch([
    db.insert(menuImports).values({
      id: importId,
      storeId: ctx.storeId,
      status: 'draft',
      sourceLocale: null,
      targetLocalesJson: '[]',
      provider: MENU_AI_PROVIDER,
      model: MENU_AI_MODEL,
      promptVersion: MENU_AI_PROMPT_VERSION,
      schemaVersion: MENU_AI_SCHEMA_VERSION,
      progress: 0,
      errorCode: null,
      usageJson: null,
      estimatedCostUsdTicks: null,
      createdByUserId: ctx.userId,
      createdAt,
      startedAt: null,
      completedAt: null,
    }),
    db.insert(menuImportAssets).values({
      id: crypto.randomUUID(),
      storeId: ctx.storeId,
      importId,
      r2Key: input.r2Key,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      pageOrder: 0,
    }),
  ]);
  return { importId };
}

export async function queueMenuImport(ctx: StoreContext, db: Db, importId: string) {
  assertPlanFeature(ctx, 'canUseAiMenuImport', 'AI menu import requires Pro');
  const rows = await db
    .select({ id: menuImports.id, status: menuImports.status })
    .from(menuImports)
    .where(and(eq(menuImports.id, importId), eq(menuImports.storeId, ctx.storeId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.status !== 'draft' && row.status !== 'failed') {
    throw new MenuImportError('INVALID_STATUS', 'Import cannot be queued from this status');
  }
  await db
    .update(menuImports)
    .set({ status: 'queued', progress: 5, errorCode: null, startedAt: null, completedAt: null })
    .where(and(eq(menuImports.id, importId), eq(menuImports.storeId, ctx.storeId)));
  return { importId };
}

export async function getLatestMenuImport(ctx: StoreContext, db: Db) {
  assertPlanFeature(ctx, 'canUseAiMenuImport', 'AI menu import requires Pro');
  const imports = await db
    .select()
    .from(menuImports)
    .where(eq(menuImports.storeId, ctx.storeId))
    .orderBy(desc(menuImports.createdAt))
    .limit(1);
  const menuImport = imports[0];
  if (!menuImport) return null;
  const rows = await db
    .select()
    .from(menuImportSuggestions)
    .where(
      and(
        eq(menuImportSuggestions.storeId, ctx.storeId),
        eq(menuImportSuggestions.importId, menuImport.id),
      ),
    )
    .orderBy(asc(menuImportSuggestions.entityType), asc(menuImportSuggestions.id));
  const suggestions = rows.map(parseSuggestionRow);
  const existingCategories = await db
    .select({ id: menuCategories.id })
    .from(menuCategories)
    .where(eq(menuCategories.storeId, ctx.storeId))
    .limit(1);
  return { menuImport, suggestions, hasExistingCategories: existingCategories.length > 0 };
}
