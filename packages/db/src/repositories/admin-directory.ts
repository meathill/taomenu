/**
 * /admin 名录：用户列表/详情、门店列表（只读）。
 *
 * 显式跨租户域：db 为首参，不走 StoreContext，调用方必须是 requireAdmin() 过的页面。
 * 列表分页固定 50；搜索只做 email / 名称模糊匹配；不返回 session 的 IP / UA 明文。
 */

import { and, desc, eq, inArray, like, ne, or, sql } from 'drizzle-orm';
import { session, user } from '../schema/auth';
import { storeMembers, stores } from '../schema/stores';
import { orders } from '../schema/tables-orders';
import type { Db } from '../types';

export const ADMIN_PAGE_SIZE = 50;

/** 页码归一：非正整数回落第 1 页。纯函数，可单测。 */
export function resolveAdminPage(raw: string | null | undefined): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return 1;
  return n;
}

function toCount(value: unknown): number {
  return Number(value ?? 0);
}

/** max(createdAt) 这类原生聚合返回的是毫秒数字，统一收成 Date。 */
function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  return new Date(Number(value));
}

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  storeCount: number;
  proStoreCount: number;
  loginCount: number;
  lastActiveAt: Date | null;
};

export type AdminUserList = {
  rows: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listAdminUsers(
  db: Db,
  input: { query: string; page: number },
): Promise<AdminUserList> {
  const page = input.page < 1 ? 1 : input.page;
  const q = input.query.trim();
  const where = q ? or(like(user.email, `%${q}%`), like(user.name, `%${q}%`)) : undefined;

  const [pageRows, totalRows] = await Promise.all([
    db
      .select({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ total: sql<number>`count(*)` }).from(user).where(where),
  ]);

  const ids = pageRows.map((row) => row.id);
  if (ids.length === 0) {
    return { rows: [], total: toCount(totalRows[0]?.total), page, pageSize: ADMIN_PAGE_SIZE };
  }

  const [memberGroups, loginGroups] = await Promise.all([
    db
      .select({
        userId: storeMembers.userId,
        storeCount: sql<number>`count(*)`,
        proStoreCount: sql<number>`coalesce(sum(case when ${stores.plan} = 'pro' then 1 else 0 end), 0)`,
      })
      .from(storeMembers)
      .innerJoin(stores, and(eq(storeMembers.storeId, stores.id), eq(stores.isActive, true)))
      .where(and(inArray(storeMembers.userId, ids), eq(storeMembers.role, 'owner')))
      .groupBy(storeMembers.userId),
    db
      .select({
        userId: session.userId,
        loginCount: sql<number>`count(*)`,
        lastActiveAt: sql<Date | null>`max(${session.createdAt})`,
      })
      .from(session)
      .where(inArray(session.userId, ids))
      .groupBy(session.userId),
  ]);

  const membersByUser = new Map(memberGroups.map((row) => [row.userId, row]));
  const loginsByUser = new Map(loginGroups.map((row) => [row.userId, row]));

  return {
    rows: pageRows.map((row) => {
      const members = membersByUser.get(row.id);
      const logins = loginsByUser.get(row.id);
      return {
        ...row,
        storeCount: toCount(members?.storeCount),
        proStoreCount: toCount(members?.proStoreCount),
        loginCount: toCount(logins?.loginCount),
        lastActiveAt: toDate(logins?.lastActiveAt),
      };
    }),
    total: toCount(totalRows[0]?.total),
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
}

export type AdminUserStore = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  orderCount: number;
  gmvMinor: number;
};

export type AdminUserDetail = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  totalLogins: number;
  lastActiveAt: Date | null;
  stores: AdminUserStore[];
} | null;

export async function getAdminUserDetail(db: Db, userId: string): Promise<AdminUserDetail> {
  const userRows = await db
    .select({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  const found = userRows[0];
  if (!found) return null;

  const [ownedStores, loginRows] = await Promise.all([
    db
      .select({
        id: stores.id,
        name: stores.name,
        slug: stores.slug,
        plan: stores.plan,
        currency: stores.currency,
        isActive: stores.isActive,
        createdAt: stores.createdAt,
      })
      .from(storeMembers)
      .innerJoin(stores, eq(storeMembers.storeId, stores.id))
      .where(and(eq(storeMembers.userId, userId), eq(storeMembers.role, 'owner')))
      .orderBy(desc(stores.createdAt)),
    db
      .select({
        totalLogins: sql<number>`count(*)`,
        lastActiveAt: sql<Date | null>`max(${session.createdAt})`,
      })
      .from(session)
      .where(eq(session.userId, userId)),
  ]);

  const storeIds = ownedStores.map((row) => row.id);
  const statsByStore = new Map<string, { orderCount: number; gmvMinor: number }>();
  if (storeIds.length > 0) {
    const stats = await db
      .select({
        storeId: orders.storeId,
        orderCount: sql<number>`count(*)`,
        gmvMinor: sql<number>`coalesce(sum(${orders.subtotalAmount}), 0)`,
      })
      .from(orders)
      .where(and(inArray(orders.storeId, storeIds), ne(orders.status, 'cancelled')))
      .groupBy(orders.storeId);
    for (const row of stats) {
      statsByStore.set(row.storeId, {
        orderCount: toCount(row.orderCount),
        gmvMinor: toCount(row.gmvMinor),
      });
    }
  }

  return {
    ...found,
    totalLogins: toCount(loginRows[0]?.totalLogins),
    lastActiveAt: toDate(loginRows[0]?.lastActiveAt),
    stores: ownedStores.map((row) => ({
      ...row,
      orderCount: statsByStore.get(row.id)?.orderCount ?? 0,
      gmvMinor: statsByStore.get(row.id)?.gmvMinor ?? 0,
    })),
  };
}

export type AdminStoreRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  owners: string[];
  orderCount: number;
  gmvMinor: number;
  lastOrderAt: Date | null;
};

export type AdminStoreList = {
  rows: AdminStoreRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listAdminStores(
  db: Db,
  input: { query: string; page: number },
): Promise<AdminStoreList> {
  const page = input.page < 1 ? 1 : input.page;
  const q = input.query.trim();
  const where = q ? or(like(stores.name, `%${q}%`), like(stores.slug, `%${q}%`)) : undefined;

  const [pageRows, totalRows] = await Promise.all([
    db
      .select({
        id: stores.id,
        name: stores.name,
        slug: stores.slug,
        plan: stores.plan,
        currency: stores.currency,
        isActive: stores.isActive,
        createdAt: stores.createdAt,
      })
      .from(stores)
      .where(where)
      .orderBy(desc(stores.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ total: sql<number>`count(*)` }).from(stores).where(where),
  ]);

  const ids = pageRows.map((row) => row.id);
  if (ids.length === 0) {
    return { rows: [], total: toCount(totalRows[0]?.total), page, pageSize: ADMIN_PAGE_SIZE };
  }

  const [ownerRows, orderGroups] = await Promise.all([
    db
      .select({ storeId: storeMembers.storeId, email: user.email })
      .from(storeMembers)
      .innerJoin(user, eq(storeMembers.userId, user.id))
      .where(and(inArray(storeMembers.storeId, ids), eq(storeMembers.role, 'owner')))
      .orderBy(user.email),
    db
      .select({
        storeId: orders.storeId,
        orderCount: sql<number>`count(*)`,
        gmvMinor: sql<number>`coalesce(sum(${orders.subtotalAmount}), 0)`,
        lastOrderAt: sql<Date | null>`max(${orders.createdAt})`,
      })
      .from(orders)
      .where(and(inArray(orders.storeId, ids), ne(orders.status, 'cancelled')))
      .groupBy(orders.storeId),
  ]);

  const ownersByStore = new Map<string, string[]>();
  for (const row of ownerRows) {
    const list = ownersByStore.get(row.storeId) ?? [];
    list.push(row.email);
    ownersByStore.set(row.storeId, list);
  }
  const statsByStore = new Map(
    orderGroups.map((row) => [
      row.storeId,
      {
        orderCount: toCount(row.orderCount),
        gmvMinor: toCount(row.gmvMinor),
        lastOrderAt: toDate(row.lastOrderAt),
      },
    ]),
  );

  return {
    rows: pageRows.map((row) => ({
      ...row,
      owners: ownersByStore.get(row.id) ?? [],
      orderCount: statsByStore.get(row.id)?.orderCount ?? 0,
      gmvMinor: statsByStore.get(row.id)?.gmvMinor ?? 0,
      lastOrderAt: statsByStore.get(row.id)?.lastOrderAt ?? null,
    })),
    total: toCount(totalRows[0]?.total),
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
}
