import { and, asc, eq } from 'drizzle-orm';
import { generateToken } from '../crypto-token';
import { diningTables, pickupPoints } from '../schema/tables-orders';
import { nowMs } from '../time';
import type { Db, StoreContext } from '../types';

export type DiningTableView = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  /** 明文长期有效，二维码可随时重新打印 */
  token: string;
  updatedAt: Date;
};

export async function listDiningTables(ctx: StoreContext, db: Db) {
  return db
    .select({
      id: diningTables.id,
      name: diningTables.name,
      sortOrder: diningTables.sortOrder,
      isActive: diningTables.isActive,
      token: diningTables.token,
      updatedAt: diningTables.updatedAt,
    })
    .from(diningTables)
    .where(eq(diningTables.storeId, ctx.storeId))
    .orderBy(asc(diningTables.sortOrder), asc(diningTables.createdAt));
}

export async function createDiningTable(
  ctx: StoreContext,
  db: Db,
  input: { name: string },
): Promise<DiningTableView> {
  const token = generateToken();
  const createdAt = nowMs();
  const id = crypto.randomUUID();
  const existing = await listDiningTables(ctx, db);
  const sortOrder = existing.length;

  await db.insert(diningTables).values({
    id,
    storeId: ctx.storeId,
    name: input.name.trim(),
    sortOrder,
    token,
    isActive: true,
    createdAt,
    updatedAt: createdAt,
  });

  return {
    id,
    name: input.name.trim(),
    sortOrder,
    isActive: true,
    token,
    updatedAt: createdAt,
  };
}

export async function updateDiningTable(
  ctx: StoreContext,
  db: Db,
  tableId: string,
  input: { name?: string; isActive?: boolean },
): Promise<DiningTableView | null> {
  const rows = await db
    .select()
    .from(diningTables)
    .where(and(eq(diningTables.id, tableId), eq(diningTables.storeId, ctx.storeId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const updatedAt = nowMs();
  await db
    .update(diningTables)
    .set({
      name: input.name?.trim() || row.name,
      isActive: input.isActive ?? row.isActive,
      updatedAt,
    })
    .where(and(eq(diningTables.id, tableId), eq(diningTables.storeId, ctx.storeId)));
  return {
    id: row.id,
    name: input.name?.trim() || row.name,
    sortOrder: row.sortOrder,
    isActive: input.isActive ?? row.isActive,
    token: row.token,
    updatedAt,
  };
}

export async function listPickupPoints(ctx: StoreContext, db: Db) {
  return db
    .select({
      id: pickupPoints.id,
      name: pickupPoints.name,
      sortOrder: pickupPoints.sortOrder,
      isActive: pickupPoints.isActive,
      token: pickupPoints.token,
      updatedAt: pickupPoints.updatedAt,
    })
    .from(pickupPoints)
    .where(eq(pickupPoints.storeId, ctx.storeId))
    .orderBy(asc(pickupPoints.sortOrder), asc(pickupPoints.createdAt));
}

export async function createPickupPoint(
  ctx: StoreContext,
  db: Db,
  input: { name: string },
): Promise<DiningTableView> {
  const token = generateToken();
  const createdAt = nowMs();
  const id = crypto.randomUUID();
  const existing = await listPickupPoints(ctx, db);

  await db.insert(pickupPoints).values({
    id,
    storeId: ctx.storeId,
    name: input.name.trim(),
    sortOrder: existing.length,
    token,
    isActive: true,
    createdAt,
    updatedAt: createdAt,
  });

  return {
    id,
    name: input.name.trim(),
    sortOrder: existing.length,
    isActive: true,
    token,
    updatedAt: createdAt,
  };
}

export async function updatePickupPoint(
  ctx: StoreContext,
  db: Db,
  pointId: string,
  input: { name?: string; isActive?: boolean },
): Promise<DiningTableView | null> {
  const rows = await db
    .select()
    .from(pickupPoints)
    .where(and(eq(pickupPoints.id, pointId), eq(pickupPoints.storeId, ctx.storeId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const updatedAt = nowMs();
  await db
    .update(pickupPoints)
    .set({
      name: input.name?.trim() || row.name,
      isActive: input.isActive ?? row.isActive,
      updatedAt,
    })
    .where(and(eq(pickupPoints.id, pointId), eq(pickupPoints.storeId, ctx.storeId)));
  return {
    id: row.id,
    name: input.name?.trim() || row.name,
    sortOrder: row.sortOrder,
    isActive: input.isActive ?? row.isActive,
    token: row.token,
    updatedAt,
  };
}

export async function findDiningTableByToken(db: Db, token: string) {
  const rows = await db
    .select()
    .from(diningTables)
    .where(and(eq(diningTables.token, token), eq(diningTables.isActive, true)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findPickupPointByToken(db: Db, token: string) {
  const rows = await db
    .select()
    .from(pickupPoints)
    .where(and(eq(pickupPoints.token, token), eq(pickupPoints.isActive, true)))
    .limit(1);
  return rows[0] ?? null;
}
