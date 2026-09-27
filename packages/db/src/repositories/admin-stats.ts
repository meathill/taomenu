/**
 * /admin 统计后台聚合（Phase 1：只读 D1 原生数据，不打新点）。
 *
 * 显式跨租户域：db 为首参，不走 StoreContext，调用方必须是 requireAdmin() 过的页面。
 * 口径诚实边界见 WIP.md：登录活跃不是访问量，Pro 是当前快照，
 * 金额按门店币种分别合计、不同币种绝不相加，取消单与停用店不计经营指标。
 */

import { and, countDistinct, eq, gte, lt, ne, sql } from 'drizzle-orm';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';
import { session, user } from '../schema/auth';
import { menus } from '../schema/menu';
import { storeMembers, stores } from '../schema/stores';
import { orders, payments, serviceRequests } from '../schema/tables-orders';
import type { Db } from '../types';

export const ADMIN_RANGE_DAYS = [7, 30, 90] as const;
export type AdminRangeDays = (typeof ADMIN_RANGE_DAYS)[number];

/** range=7d/30d/90d，非法的回落 30d。纯函数，可单测。 */
export function resolveAdminRangeDays(raw: string | null | undefined): AdminRangeDays {
  if (raw === '7d') return 7;
  if (raw === '90d') return 90;
  return 30;
}

export type AdminRange = {
  days: AdminRangeDays;
  /** UTC 零点起的半开区间 [start, end)。 */
  start: Date;
  end: Date;
  /** UTC 的 YYYY-MM-DD 序列，end 当天在内。 */
  labels: string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** 最近 N 个 UTC 整天（含今天）。纯函数，可单测。 */
export function getAdminRange(days: AdminRangeDays, now = new Date()): AdminRange {
  const endTime = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const end = new Date(endTime);
  const start = new Date(endTime - days * DAY_MS);
  const labels: string[] = [];
  for (let i = 0; i < days; i++) {
    labels.push(new Date(start.getTime() + i * DAY_MS).toISOString().slice(0, 10));
  }
  return { days, start, end, labels };
}

/** created_at 是毫秒整数，转秒后按 UTC 取天。 */
function dayBucket(column: AnySQLiteColumn): ReturnType<typeof sql<string>> {
  return sql<string>`strftime('%Y-%m-%d', ${column} / 1000, 'unixepoch')`;
}

/** SQLite 聚合结果可能是 number / bigint / string，统一收口。 */
function toCount(value: unknown): number {
  return Number(value ?? 0);
}

export type GmvByCurrency = {
  currency: string;
  totalMinor: number;
  count: number;
};

export type AdminOverview = {
  newUsers: number;
  newStores: number;
  newPublishes: number;
  orders: number;
  gmvByCurrency: GmvByCurrency[];
  /** range 内有过登录的不同用户数，是“登录活跃”不是访问量。 */
  activeUsers: number;
  totalUsers: number;
  totalStores: number;
  proStores: number;
  publishedStores: number;
};

export async function getAdminOverview(db: Db, range: AdminRange): Promise<AdminOverview> {
  const { start, end } = range;
  const [
    userRows,
    storeRows,
    publishRows,
    orderGroups,
    activeRows,
    totalUserRows,
    totalStoreRows,
    proStoreRows,
    publishedStoreRows,
  ] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)` })
      .from(user)
      .where(and(gte(user.createdAt, start), lt(user.createdAt, end))),
    db
      .select({ total: sql<number>`count(*)` })
      .from(stores)
      .where(and(gte(stores.createdAt, start), lt(stores.createdAt, end))),
    db
      .select({ total: sql<number>`count(*)` })
      .from(menus)
      .innerJoin(stores, eq(menus.storeId, stores.id))
      .where(
        and(gte(menus.publishedAt, start), lt(menus.publishedAt, end), eq(stores.isActive, true)),
      ),
    db
      .select({
        currency: stores.currency,
        totalMinor: sql<number>`coalesce(sum(${orders.subtotalAmount}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(orders)
      .innerJoin(stores, eq(orders.storeId, stores.id))
      .where(
        and(
          gte(orders.createdAt, start),
          lt(orders.createdAt, end),
          ne(orders.status, 'cancelled'),
          eq(stores.isActive, true),
        ),
      )
      .groupBy(stores.currency)
      .orderBy(stores.currency),
    db
      .select({ total: countDistinct(session.userId) })
      .from(session)
      .where(and(gte(session.createdAt, start), lt(session.createdAt, end))),
    db.select({ total: sql<number>`count(*)` }).from(user),
    db.select({ total: sql<number>`count(*)` }).from(stores).where(eq(stores.isActive, true)),
    db
      .select({ total: sql<number>`count(*)` })
      .from(stores)
      .where(and(eq(stores.isActive, true), eq(stores.plan, 'pro'))),
    db
      .select({ total: countDistinct(menus.storeId) })
      .from(menus)
      .innerJoin(stores, eq(menus.storeId, stores.id))
      .where(and(eq(menus.status, 'published'), eq(stores.isActive, true))),
  ]);

  const gmvByCurrency = orderGroups.map((row) => ({
    currency: row.currency,
    totalMinor: toCount(row.totalMinor),
    count: toCount(row.count),
  }));

  return {
    newUsers: toCount(userRows[0]?.total),
    newStores: toCount(storeRows[0]?.total),
    newPublishes: toCount(publishRows[0]?.total),
    orders: gmvByCurrency.reduce((sum, item) => sum + item.count, 0),
    gmvByCurrency,
    activeUsers: toCount(activeRows[0]?.total),
    totalUsers: toCount(totalUserRows[0]?.total),
    totalStores: toCount(totalStoreRows[0]?.total),
    proStores: toCount(proStoreRows[0]?.total),
    publishedStores: toCount(publishedStoreRows[0]?.total),
  };
}

export type AdminDailyPoint = {
  day: string;
  newUsers: number;
  newStores: number;
  orders: number;
  activeUsers: number;
};

/** 按天序列，空天补 0，保证长度与 labels 一致。 */
export async function getAdminDailySeries(db: Db, range: AdminRange): Promise<AdminDailyPoint[]> {
  const { start, end, labels } = range;
  const [userGroups, storeGroups, orderGroups, activeGroups] = await Promise.all([
    db
      .select({ day: dayBucket(user.createdAt), total: sql<number>`count(*)` })
      .from(user)
      .where(and(gte(user.createdAt, start), lt(user.createdAt, end)))
      .groupBy(dayBucket(user.createdAt)),
    db
      .select({ day: dayBucket(stores.createdAt), total: sql<number>`count(*)` })
      .from(stores)
      .where(and(gte(stores.createdAt, start), lt(stores.createdAt, end)))
      .groupBy(dayBucket(stores.createdAt)),
    db
      .select({ day: dayBucket(orders.createdAt), total: sql<number>`count(*)` })
      .from(orders)
      .innerJoin(stores, eq(orders.storeId, stores.id))
      .where(
        and(
          gte(orders.createdAt, start),
          lt(orders.createdAt, end),
          ne(orders.status, 'cancelled'),
          eq(stores.isActive, true),
        ),
      )
      .groupBy(dayBucket(orders.createdAt)),
    db
      .select({ day: dayBucket(session.createdAt), total: countDistinct(session.userId) })
      .from(session)
      .where(and(gte(session.createdAt, start), lt(session.createdAt, end)))
      .groupBy(dayBucket(session.createdAt)),
  ]);

  const pick = (groups: Array<{ day: string; total: unknown }>, day: string): number => {
    const found = groups.find((row) => row.day === day);
    return toCount(found?.total);
  };

  return labels.map((day) => ({
    day,
    newUsers: pick(userGroups, day),
    newStores: pick(storeGroups, day),
    orders: pick(orderGroups, day),
    activeUsers: pick(activeGroups, day),
  }));
}

export type AdminFunnel = {
  totalUsers: number;
  usersWithStore: number;
  storesPublished: number;
  storesWithOrder: number;
  proStores: number;
};

/** 累计转化漏斗：注册 → 建店（owner）→ 发布菜单 → 出首单 → Pro。 */
export async function getAdminFunnel(db: Db): Promise<AdminFunnel> {
  const [totalUserRows, withStoreRows, publishedRows, withOrderRows, proRows] = await Promise.all([
    db.select({ total: sql<number>`count(*)` }).from(user),
    db
      .select({ total: countDistinct(storeMembers.userId) })
      .from(storeMembers)
      .innerJoin(stores, eq(storeMembers.storeId, stores.id))
      .where(and(eq(storeMembers.role, 'owner'), eq(stores.isActive, true))),
    db
      .select({ total: countDistinct(menus.storeId) })
      .from(menus)
      .innerJoin(stores, eq(menus.storeId, stores.id))
      .where(and(eq(menus.status, 'published'), eq(stores.isActive, true))),
    db
      .select({ total: countDistinct(orders.storeId) })
      .from(orders)
      .innerJoin(stores, eq(orders.storeId, stores.id))
      .where(and(ne(orders.status, 'cancelled'), eq(stores.isActive, true))),
    db
      .select({ total: sql<number>`count(*)` })
      .from(stores)
      .where(and(eq(stores.isActive, true), eq(stores.plan, 'pro'))),
  ]);

  return {
    totalUsers: toCount(totalUserRows[0]?.total),
    usersWithStore: toCount(withStoreRows[0]?.total),
    storesPublished: toCount(publishedRows[0]?.total),
    storesWithOrder: toCount(withOrderRows[0]?.total),
    proStores: toCount(proRows[0]?.total),
  };
}

export type AdminBehavior = {
  orderStatus: Array<{ status: string; count: number }>;
  fulfillment: Array<{ mode: string; currency: string; count: number; totalMinor: number }>;
  serviceRequests: Array<{ type: string; count: number; resolved: number }>;
  payments: Array<{ method: string; currency: string; count: number; totalMinor: number }>;
};

/** 匿名顾客行为：订单状态/履约方式分布、呼叫与结账请求、人工收款记录。 */
export async function getAdminBehavior(db: Db, range: AdminRange): Promise<AdminBehavior> {
  const { start, end } = range;
  const [statusGroups, fulfillmentGroups, requestGroups, paymentGroups] = await Promise.all([
    db
      .select({ status: orders.status, count: sql<number>`count(*)` })
      .from(orders)
      .innerJoin(stores, eq(orders.storeId, stores.id))
      .where(
        and(gte(orders.createdAt, start), lt(orders.createdAt, end), eq(stores.isActive, true)),
      )
      .groupBy(orders.status)
      .orderBy(orders.status),
    db
      .select({
        mode: orders.fulfillmentMode,
        currency: stores.currency,
        count: sql<number>`count(*)`,
        totalMinor: sql<number>`coalesce(sum(${orders.subtotalAmount}), 0)`,
      })
      .from(orders)
      .innerJoin(stores, eq(orders.storeId, stores.id))
      .where(
        and(
          gte(orders.createdAt, start),
          lt(orders.createdAt, end),
          ne(orders.status, 'cancelled'),
          eq(stores.isActive, true),
        ),
      )
      .groupBy(orders.fulfillmentMode, stores.currency)
      .orderBy(orders.fulfillmentMode, stores.currency),
    db
      .select({
        type: serviceRequests.type,
        count: sql<number>`count(*)`,
        resolved: sql<number>`coalesce(sum(case when ${serviceRequests.status} = 'resolved' then 1 else 0 end), 0)`,
      })
      .from(serviceRequests)
      .innerJoin(stores, eq(serviceRequests.storeId, stores.id))
      .where(
        and(
          gte(serviceRequests.createdAt, start),
          lt(serviceRequests.createdAt, end),
          eq(stores.isActive, true),
        ),
      )
      .groupBy(serviceRequests.type)
      .orderBy(serviceRequests.type),
    db
      .select({
        method: payments.method,
        currency: stores.currency,
        count: sql<number>`count(*)`,
        totalMinor: sql<number>`coalesce(sum(${payments.amount}), 0)`,
      })
      .from(payments)
      .innerJoin(stores, eq(payments.storeId, stores.id))
      .where(
        and(gte(payments.createdAt, start), lt(payments.createdAt, end), eq(stores.isActive, true)),
      )
      .groupBy(payments.method, stores.currency)
      .orderBy(payments.method, stores.currency),
  ]);

  return {
    orderStatus: statusGroups.map((row) => ({ status: row.status, count: toCount(row.count) })),
    fulfillment: fulfillmentGroups.map((row) => ({
      mode: row.mode,
      currency: row.currency,
      count: toCount(row.count),
      totalMinor: toCount(row.totalMinor),
    })),
    serviceRequests: requestGroups.map((row) => ({
      type: row.type,
      count: toCount(row.count),
      resolved: toCount(row.resolved),
    })),
    payments: paymentGroups.map((row) => ({
      method: row.method,
      currency: row.currency,
      count: toCount(row.count),
      totalMinor: toCount(row.totalMinor),
    })),
  };
}
