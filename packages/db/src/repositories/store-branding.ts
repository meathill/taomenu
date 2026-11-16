import { type PlanId, shouldShowPoweredBy } from '@taomenu/shared';
import { eq } from 'drizzle-orm';
import { storeBranding } from '../schema/store-branding';
import { nowMs } from '../time';
import type { Db, StoreContext } from '../types';

export type StoreBranding = {
  hidePoweredBy: boolean;
  coverImageKey: string | null;
};

const DEFAULT_STORE_BRANDING: StoreBranding = { hidePoweredBy: false, coverImageKey: null };

export class StoreBrandingError extends Error {
  constructor(readonly code: 'PRO_REQUIRED' | 'NOT_MIGRATED') {
    super(code);
    this.name = 'StoreBrandingError';
  }
}

/** migration 0016 还没在线上执行时，表不存在；此时按默认值降级，不能让公开菜单 500 */
function isMissingBrandingSchemaError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current instanceof Error; depth += 1) {
    if (/no such table/i.test(current.message) || /no such column/i.test(current.message)) {
      return true;
    }
    current = current.cause;
  }
  return false;
}

export async function getStoreBranding(db: Db, storeId: string): Promise<StoreBranding> {
  try {
    const rows = await db
      .select({
        hidePoweredBy: storeBranding.hidePoweredBy,
        coverImageKey: storeBranding.coverImageKey,
      })
      .from(storeBranding)
      .where(eq(storeBranding.storeId, storeId))
      .limit(1);
    const row = rows[0];
    if (!row) return DEFAULT_STORE_BRANDING;
    return { hidePoweredBy: row.hidePoweredBy, coverImageKey: row.coverImageKey ?? null };
  } catch (error) {
    if (isMissingBrandingSchemaError(error)) {
      return DEFAULT_STORE_BRANDING;
    }
    throw error;
  }
}

/** 公开菜单用：套餐 + 开关共同决定，降级回 Free 后自动恢复显示 */
export async function getShowPoweredBy(db: Db, storeId: string, plan: PlanId): Promise<boolean> {
  const branding = await getStoreBranding(db, storeId);
  return shouldShowPoweredBy(plan, branding.hidePoweredBy);
}

/** 只有 Pro 能打开隐藏；任何套餐都可以关回去（重新显示） */
export async function updateStoreBranding(
  ctx: StoreContext,
  db: Db,
  input: { hidePoweredBy: boolean },
): Promise<StoreBranding> {
  if (input.hidePoweredBy && shouldShowPoweredBy(ctx.plan, true)) {
    throw new StoreBrandingError('PRO_REQUIRED');
  }
  const updatedAt = nowMs();
  try {
    await db
      .insert(storeBranding)
      .values({ storeId: ctx.storeId, hidePoweredBy: input.hidePoweredBy, updatedAt })
      .onConflictDoUpdate({
        target: storeBranding.storeId,
        // 不改 coverImageKey，避免开关 Powered by 时把封面清掉
        set: { hidePoweredBy: input.hidePoweredBy, updatedAt },
      });
  } catch (error) {
    if (isMissingBrandingSchemaError(error)) {
      throw new StoreBrandingError('NOT_MIGRATED');
    }
    throw error;
  }
  return getStoreBranding(db, ctx.storeId);
}

/** 设置或清除店铺封面；返回被替换的旧 key，便于删除 R2 对象 */
export async function setStoreCoverImage(
  ctx: StoreContext,
  db: Db,
  coverImageKey: string | null,
): Promise<{ coverImageKey: string | null; previousKey: string | null }> {
  const current = await getStoreBranding(db, ctx.storeId);
  const updatedAt = nowMs();
  try {
    await db
      .insert(storeBranding)
      .values({
        storeId: ctx.storeId,
        hidePoweredBy: current.hidePoweredBy,
        coverImageKey,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: storeBranding.storeId,
        set: { coverImageKey, updatedAt },
      });
  } catch (error) {
    if (isMissingBrandingSchemaError(error)) {
      throw new StoreBrandingError('NOT_MIGRATED');
    }
    throw error;
  }
  return { coverImageKey, previousKey: current.coverImageKey };
}
