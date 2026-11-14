import { doLocalesShareLanguage } from '@taomenu/shared';
import { and, desc, eq } from 'drizzle-orm';
import { assertPlanFeature } from '../plan-features';
import { menuCategories } from '../schema/menu';
import { menuImportSuggestions, menuImports } from '../schema/menu-ai';
import { stores } from '../schema/stores';
import type { Db, StoreContext } from '../types';
import { MenuImportError } from './menu-ai-config';

/** 自动作废的旧草稿：识别语言与已有菜单不同、且修复前没有翻译，永远无法写入（issue #29） */
export const LEGACY_LOCALE_MISMATCH_ERROR = 'LOCALE_MISMATCH';

/** 可以放弃的状态；processing 时 Worker 正在写结果，放弃会被覆盖，所以不允许 */
const DISCARDABLE = new Set(['draft', 'queued', 'needs_review', 'failed']);

/**
 * 放弃一次导入：状态改为 cancelled，导入面板回到上传状态。
 * 放弃本身不产生额度；还没识别过（draft/queued）的导入被放弃后也不计入额度。
 */
export async function discardMenuImport(ctx: StoreContext, db: Db, importId: string) {
  assertPlanFeature(ctx, 'canUseAiMenuImport', 'AI menu import requires Pro');
  const rows = await db
    .select({ status: menuImports.status })
    .from(menuImports)
    .where(and(eq(menuImports.id, importId), eq(menuImports.storeId, ctx.storeId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.status === 'cancelled') return { importId };
  if (!DISCARDABLE.has(row.status)) {
    throw new MenuImportError('INVALID_STATUS', 'Import cannot be discarded from this status');
  }
  await db
    .update(menuImports)
    .set({ status: 'cancelled', progress: 100 })
    .where(and(eq(menuImports.id, importId), eq(menuImports.storeId, ctx.storeId)));
  return { importId };
}

/**
 * 修复 #29 之前识别出的、语言与已有菜单不同的草稿没有译文，永远无法写入。
 * 读取最新导入时把它标记为失败（失败不占额度），让店主可以直接重新上传。
 */
export async function retireUnappliableMenuImport(ctx: StoreContext, db: Db): Promise<boolean> {
  const latest = await db
    .select({ id: menuImports.id, status: menuImports.status })
    .from(menuImports)
    .where(eq(menuImports.storeId, ctx.storeId))
    .orderBy(desc(menuImports.createdAt))
    .limit(1);
  const menuImport = latest[0];
  if (menuImport?.status !== 'needs_review') return false;
  const [store, category, suggestions] = await Promise.all([
    db
      .select({ baseLocale: stores.baseLocale })
      .from(stores)
      .where(eq(stores.id, ctx.storeId))
      .limit(1),
    db
      .select({ id: menuCategories.id })
      .from(menuCategories)
      .where(eq(menuCategories.storeId, ctx.storeId))
      .limit(1),
    db
      .select({
        locale: menuImportSuggestions.locale,
        valueJson: menuImportSuggestions.suggestedValueJson,
      })
      .from(menuImportSuggestions)
      .where(
        and(
          eq(menuImportSuggestions.storeId, ctx.storeId),
          eq(menuImportSuggestions.importId, menuImport.id),
        ),
      ),
  ]);
  const baseLocale = store[0]?.baseLocale;
  if (!baseLocale || category.length === 0 || suggestions.length === 0) return false;
  const isUnappliable = suggestions.some(
    (suggestion) =>
      !doLocalesShareLanguage(baseLocale, suggestion.locale) && !hasOriginal(suggestion.valueJson),
  );
  if (!isUnappliable) return false;
  await db
    .update(menuImports)
    .set({ status: 'failed', errorCode: LEGACY_LOCALE_MISMATCH_ERROR, progress: 100 })
    .where(and(eq(menuImports.id, menuImport.id), eq(menuImports.storeId, ctx.storeId)));
  return true;
}

function hasOriginal(valueJson: string): boolean {
  try {
    const value = JSON.parse(valueJson) as { original?: unknown };
    return Boolean(value.original);
  } catch {
    return false;
  }
}
