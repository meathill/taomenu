import { and, eq } from 'drizzle-orm';
import { storeMembers, stores } from '../schema';
import type { Db, StoreContext } from '../types';

/** 校验用户是否为门店成员；不是则返回 null（API 层映射为 404）。 */
export async function resolveStoreContext(
  db: Db,
  userId: string,
  storeId: string,
): Promise<StoreContext | null> {
  const rows = await db
    .select({
      storeId: stores.id,
      plan: stores.plan,
      role: storeMembers.role,
      isActive: stores.isActive,
      staffSeatAddons: stores.staffSeatAddons,
    })
    .from(storeMembers)
    .innerJoin(stores, eq(stores.id, storeMembers.storeId))
    .where(and(eq(storeMembers.userId, userId), eq(storeMembers.storeId, storeId)))
    .limit(1);

  const row = rows[0];
  if (!row?.isActive) {
    return null;
  }

  return {
    storeId: row.storeId,
    userId,
    role: row.role,
    plan: row.plan,
    staffSeatAddons: row.staffSeatAddons,
  };
}

export async function listStoreContextsForUser(db: Db, userId: string): Promise<StoreContext[]> {
  const rows = await db
    .select({
      storeId: stores.id,
      plan: stores.plan,
      role: storeMembers.role,
      staffSeatAddons: stores.staffSeatAddons,
    })
    .from(storeMembers)
    .innerJoin(stores, eq(stores.id, storeMembers.storeId))
    .where(and(eq(storeMembers.userId, userId), eq(stores.isActive, true)));

  return rows.map((row) => ({
    storeId: row.storeId,
    userId,
    role: row.role,
    plan: row.plan,
    staffSeatAddons: row.staffSeatAddons,
  }));
}
