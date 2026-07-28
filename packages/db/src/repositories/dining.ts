import { and, asc, eq } from 'drizzle-orm';
import { generateToken, hashToken } from '../crypto-token';
import { diningTables, pickupPoints } from '../schema/tables-orders';
import type { Db, StoreContext } from '../types';

function nowMs(): Date {
  return new Date();
}

export type DiningTableView = {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  tokenVersion: number;
  /** 仅创建/轮换时返回明文 token */
  token?: string;
};

export async function listDiningTables(ctx: StoreContext, db: Db) {
  return db
    .select({
      id: diningTables.id,
      name: diningTables.name,
      sortOrder: diningTables.sortOrder,
      isActive: diningTables.isActive,
      tokenVersion: diningTables.tokenVersion,
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
  const tokenHash = await hashToken(token);
  const createdAt = nowMs();
  const id = crypto.randomUUID();
  const existing = await listDiningTables(ctx, db);
  const sortOrder = existing.length;

  await db.insert(diningTables).values({
    id,
    storeId: ctx.storeId,
    name: input.name.trim(),
    sortOrder,
    tokenHash,
    tokenVersion: 1,
    isActive: true,
    createdAt,
    updatedAt: createdAt,
  });

  return {
    id,
    name: input.name.trim(),
    sortOrder,
    isActive: true,
    tokenVersion: 1,
    token,
  };
}

export async function rotateDiningTableToken(
  ctx: StoreContext,
  db: Db,
  tableId: string,
): Promise<DiningTableView | null> {
  const rows = await db
    .select()
    .from(diningTables)
    .where(and(eq(diningTables.id, tableId), eq(diningTables.storeId, ctx.storeId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const token = generateToken();
  const tokenHash = await hashToken(token);
  const tokenVersion = row.tokenVersion + 1;
  const updatedAt = nowMs();
  await db
    .update(diningTables)
    .set({ tokenHash, tokenVersion, updatedAt })
    .where(and(eq(diningTables.id, tableId), eq(diningTables.storeId, ctx.storeId)));

  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    tokenVersion,
    token,
  };
}

export async function listPickupPoints(ctx: StoreContext, db: Db) {
  return db
    .select({
      id: pickupPoints.id,
      name: pickupPoints.name,
      sortOrder: pickupPoints.sortOrder,
      isActive: pickupPoints.isActive,
      tokenVersion: pickupPoints.tokenVersion,
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
  const tokenHash = await hashToken(token);
  const createdAt = nowMs();
  const id = crypto.randomUUID();
  const existing = await listPickupPoints(ctx, db);

  await db.insert(pickupPoints).values({
    id,
    storeId: ctx.storeId,
    name: input.name.trim(),
    sortOrder: existing.length,
    tokenHash,
    tokenVersion: 1,
    isActive: true,
    createdAt,
    updatedAt: createdAt,
  });

  return {
    id,
    name: input.name.trim(),
    sortOrder: existing.length,
    isActive: true,
    tokenVersion: 1,
    token,
  };
}

export async function findDiningTableByToken(db: Db, token: string) {
  const tokenHash = await hashToken(token);
  const rows = await db
    .select()
    .from(diningTables)
    .where(and(eq(diningTables.tokenHash, tokenHash), eq(diningTables.isActive, true)))
    .limit(1);
  return rows[0] ?? null;
}

export async function findPickupPointByToken(db: Db, token: string) {
  const tokenHash = await hashToken(token);
  const rows = await db
    .select()
    .from(pickupPoints)
    .where(and(eq(pickupPoints.tokenHash, tokenHash), eq(pickupPoints.isActive, true)))
    .limit(1);
  return rows[0] ?? null;
}
