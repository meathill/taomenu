import { and, desc, eq, gte, isNull, lt, ne, sql } from 'drizzle-orm';
import { getUtcDayRange } from '../business-date';
import { diningTables, orders, payments, pickupPoints } from '../schema/tables-orders';
import { terminalDevices } from '../schema/terminal';
import type { Db, StoreContext } from '../types';
import { getMenuTree } from './menu';
import { listOpenSessions } from './payments';
import { listOpenServiceRequests } from './service-requests';
import { listActiveOrders } from './staff-orders';

export type OwnerOverview = {
  readiness: {
    menu: 'empty' | 'draft' | 'published';
    qrCount: number;
    activeTerminalCount: number;
    openOrderCount: number;
    openRequestCount: number;
  };
  stats: {
    todayOrderCount: number;
    todayOrderValue: number;
    todayRecordedPayment: number;
    openTableSessionCount: number;
  };
  recentOrders: Array<{
    id: string;
    displayNumber: number;
    status: string;
    amount: number;
    createdAt: Date;
  }>;
};

export async function getOwnerOverview(
  ctx: StoreContext,
  db: Db,
  timezone: string,
  now = new Date(),
): Promise<OwnerOverview> {
  const [
    menu,
    activeOrders,
    openRequests,
    openSessions,
    tableRows,
    pickupRows,
    terminals,
    recentOrders,
  ] = await Promise.all([
    getMenuTree(ctx, db),
    listActiveOrders(ctx, db),
    listOpenServiceRequests(ctx, db),
    listOpenSessions(ctx, db),
    db
      .select({ id: diningTables.id })
      .from(diningTables)
      .where(and(eq(diningTables.storeId, ctx.storeId), eq(diningTables.isActive, true))),
    db
      .select({ id: pickupPoints.id })
      .from(pickupPoints)
      .where(and(eq(pickupPoints.storeId, ctx.storeId), eq(pickupPoints.isActive, true))),
    db
      .select({ id: terminalDevices.id })
      .from(terminalDevices)
      .where(and(eq(terminalDevices.storeId, ctx.storeId), isNull(terminalDevices.revokedAt))),
    db
      .select({
        id: orders.id,
        displayNumber: orders.displayNumber,
        status: orders.status,
        amount: orders.subtotalAmount,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(eq(orders.storeId, ctx.storeId))
      .orderBy(desc(orders.createdAt))
      .limit(5),
  ]);

  const { start, end } = getUtcDayRange(timezone, now);
  const [todayOrderRows, todayPaymentRows] = await Promise.all([
    db
      .select({
        count: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(${orders.subtotalAmount}), 0)`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.storeId, ctx.storeId),
          gte(orders.createdAt, start),
          lt(orders.createdAt, end),
          ne(orders.status, 'cancelled'),
        ),
      ),
    db
      .select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(
        and(
          eq(payments.storeId, ctx.storeId),
          gte(payments.createdAt, start),
          lt(payments.createdAt, end),
        ),
      ),
  ]);

  const hasAvailableItems = menu.categories.some(
    (category) =>
      category.isAvailable && category.items.some((item) => item.isAvailable && !item.isSoldOut),
  );
  return {
    readiness: {
      menu: hasAvailableItems
        ? menu.menu.status === 'published'
          ? 'published'
          : 'draft'
        : 'empty',
      qrCount: tableRows.length + pickupRows.length,
      activeTerminalCount: terminals.length,
      openOrderCount: activeOrders.length,
      openRequestCount: openRequests.length,
    },
    stats: {
      todayOrderCount: Number(todayOrderRows[0]?.count ?? 0),
      todayOrderValue: Number(todayOrderRows[0]?.total ?? 0),
      todayRecordedPayment: Number(todayPaymentRows[0]?.total ?? 0),
      openTableSessionCount: openSessions.length,
    },
    recentOrders,
  };
}
