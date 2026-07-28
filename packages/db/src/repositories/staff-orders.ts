import { and, desc, eq, inArray } from 'drizzle-orm';
import { type OrderStatus, orderItems, orders } from '../schema/tables-orders';
import type { Db, StoreContext } from '../types';

const ACTIVE_STATUSES: OrderStatus[] = ['submitted', 'accepted', 'ready_for_pickup'];

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
