import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { type OrderStatus, orderItems, orders, payments } from '../schema/tables-orders';
import type { Db, StoreContext } from '../types';

const ACTIVE_STATUSES: OrderStatus[] = ['submitted', 'accepted', 'ready_for_pickup'];
const WORKBENCH_STATUSES: OrderStatus[] = [...ACTIVE_STATUSES, 'served', 'picked_up'];

export function isOrderVisibleInWorkbench(status: OrderStatus, remainingAmount: number): boolean {
  return ACTIVE_STATUSES.includes(status) || remainingAmount > 0;
}

export async function listActiveOrders(ctx: StoreContext, db: Db) {
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.storeId, ctx.storeId), inArray(orders.status, ACTIVE_STATUSES)))
    .orderBy(desc(orders.createdAt));

  const orderIds = rows.map((r) => r.id);
  const items =
    orderIds.length === 0
      ? []
      : await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));

  return rows.map((order) => ({
    id: order.id,
    status: order.status,
    fulfillmentMode: order.fulfillmentMode,
    displayNumber: order.displayNumber,
    pickupNumber: order.pickupNumber,
    tableId: order.tableId,
    subtotalAmount: order.subtotalAmount,
    createdAt: order.createdAt,
    items: items
      .filter((i) => i.orderId === order.id)
      .map((i) => ({
        name: i.nameSnapshot,
        quantity: i.quantity,
        lineTotalAmount: i.lineTotalAmount,
      })),
  }));
}

/**
 * 终端不仅要显示进行中订单，也要保留已完成但尚未收款的订单。
 * 否则店员先点“已上菜/已取餐”后会失去收款入口。
 */
export async function listOrderWorkbench(ctx: StoreContext, db: Db) {
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.storeId, ctx.storeId), inArray(orders.status, WORKBENCH_STATUSES)))
    .orderBy(desc(orders.createdAt));

  const orderIds = rows.map((row) => row.id);
  const paymentRows =
    orderIds.length === 0
      ? []
      : await db
          .select({
            orderId: payments.orderId,
            total: sql<number>`coalesce(sum(${payments.amount}), 0)`,
          })
          .from(payments)
          .where(and(eq(payments.storeId, ctx.storeId), inArray(payments.orderId, orderIds)))
          .groupBy(payments.orderId);
  const paidByOrder = new Map(
    paymentRows.flatMap((payment) =>
      payment.orderId ? ([[payment.orderId, Number(payment.total)]] as const) : [],
    ),
  );
  const visibleRows = rows
    .map((order) => {
      const paidAmount = paidByOrder.get(order.id) ?? 0;
      return {
        order,
        paidAmount,
        remainingAmount: Math.max(0, order.subtotalAmount - paidAmount),
      };
    })
    .filter(({ order, remainingAmount }) =>
      isOrderVisibleInWorkbench(order.status, remainingAmount),
    );
  const visibleOrderIds = visibleRows.map(({ order }) => order.id);
  const items =
    visibleOrderIds.length === 0
      ? []
      : await db.select().from(orderItems).where(inArray(orderItems.orderId, visibleOrderIds));

  return visibleRows.map(({ order, paidAmount, remainingAmount }) => ({
    id: order.id,
    status: order.status,
    fulfillmentMode: order.fulfillmentMode,
    displayNumber: order.displayNumber,
    pickupNumber: order.pickupNumber,
    tableId: order.tableId,
    subtotalAmount: order.subtotalAmount,
    paidAmount,
    remainingAmount,
    createdAt: order.createdAt,
    items: items
      .filter((item) => item.orderId === order.id)
      .map((item) => ({
        name: item.nameSnapshot,
        quantity: item.quantity,
        lineTotalAmount: item.lineTotalAmount,
      })),
  }));
}

export async function transitionOrder(
  ctx: StoreContext,
  db: Db,
  orderId: string,
  nextStatus: OrderStatus,
) {
  const rows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.storeId, ctx.storeId)))
    .limit(1);
  const order = rows[0];
  if (!order) return null;

  if (!canTransition(order.status, nextStatus, order.fulfillmentMode)) {
    return { error: 'INVALID_TRANSITION' as const };
  }

  await db
    .update(orders)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), eq(orders.storeId, ctx.storeId)));

  return { ok: true as const, status: nextStatus };
}

export function canTransition(from: OrderStatus, to: OrderStatus, mode: string): boolean {
  if (to === 'cancelled') {
    return from === 'submitted' || from === 'accepted' || from === 'ready_for_pickup';
  }
  if (mode === 'dine_in') {
    if (from === 'submitted' && to === 'accepted') return true;
    if (from === 'accepted' && to === 'served') return true;
    return false;
  }
  // pickup
  if (from === 'submitted' && to === 'accepted') return true;
  if (from === 'accepted' && to === 'ready_for_pickup') return true;
  if (from === 'ready_for_pickup' && to === 'picked_up') return true;
  return false;
}
