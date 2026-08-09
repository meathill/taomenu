import { and, eq, inArray, or, sql } from 'drizzle-orm';
import {
  diningTables,
  orders,
  type PaymentMethod,
  payments,
  tableSessions,
} from '../schema/tables-orders';
import type { Db, StoreContext } from '../types';

function nowMs(): Date {
  return new Date();
}

export async function recordOrderPayment(
  ctx: StoreContext,
  db: Db,
  input: { orderId: string; method: PaymentMethod; amount?: number; note?: string },
) {
  const orderRows = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, input.orderId), eq(orders.storeId, ctx.storeId)))
    .limit(1);
  const order = orderRows[0];
  if (!order) return null;

  const paidRows = await db
    .select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(and(eq(payments.storeId, ctx.storeId), eq(payments.orderId, order.id)));
  const paidAmount = Number(paidRows[0]?.total ?? 0);
  const remainingAmount = Math.max(0, order.subtotalAmount - paidAmount);
  if (remainingAmount === 0) {
    return { error: 'ALREADY_PAID' as const };
  }

  const amount = input.amount ?? remainingAmount;
  if (!Number.isInteger(amount) || amount <= 0 || amount > remainingAmount) {
    return { error: 'INVALID_AMOUNT' as const };
  }

  const id = crypto.randomUUID();
  await db.insert(payments).values({
    id,
    storeId: ctx.storeId,
    tableSessionId: order.tableSessionId,
    orderId: order.id,
    type: 'payment',
    method: input.method,
    amount,
    note: input.note?.trim() || null,
    createdAt: nowMs(),
  });

  return { ok: true as const, paymentId: id, amount, remainingAmount: remainingAmount - amount };
}

export async function recordSessionPayment(
  ctx: StoreContext,
  db: Db,
  input: { tableSessionId: string; method: PaymentMethod; amount: number; note?: string },
) {
  const sessions = await db
    .select()
    .from(tableSessions)
    .where(and(eq(tableSessions.id, input.tableSessionId), eq(tableSessions.storeId, ctx.storeId)))
    .limit(1);
  if (!sessions[0]) return null;
  if (!Number.isInteger(input.amount) || input.amount < 0) {
    return { error: 'INVALID_AMOUNT' as const };
  }

  const id = crypto.randomUUID();
  await db.insert(payments).values({
    id,
    storeId: ctx.storeId,
    tableSessionId: input.tableSessionId,
    orderId: null,
    type: 'payment',
    method: input.method,
    amount: input.amount,
    note: input.note?.trim() || null,
    createdAt: nowMs(),
  });
  return { ok: true as const, paymentId: id, amount: input.amount };
}

export async function getSessionBalance(ctx: StoreContext, db: Db, tableSessionId: string) {
  const sessions = await db
    .select()
    .from(tableSessions)
    .where(and(eq(tableSessions.id, tableSessionId), eq(tableSessions.storeId, ctx.storeId)))
    .limit(1);
  if (!sessions[0]) return null;

  const sessionOrders = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.storeId, ctx.storeId),
        eq(orders.tableSessionId, tableSessionId),
        inArray(orders.status, ['submitted', 'accepted', 'served']),
      ),
    );

  const ordered = sessionOrders.reduce((sum, o) => sum + o.subtotalAmount, 0);
  const sessionOrderIds = sessionOrders.map((order) => order.id);
  const linkedToSession =
    sessionOrderIds.length > 0
      ? or(eq(payments.tableSessionId, tableSessionId), inArray(payments.orderId, sessionOrderIds))
      : eq(payments.tableSessionId, tableSessionId);
  const payRows = await db
    .select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(and(eq(payments.storeId, ctx.storeId), linkedToSession));
  const paid = Number(payRows[0]?.total ?? 0);

  return {
    tableSessionId,
    ordered,
    paid,
    balance: ordered - paid,
    orderCount: sessionOrders.length,
    status: sessions[0].status,
  };
}

export async function closeTableSession(ctx: StoreContext, db: Db, tableSessionId: string) {
  const balance = await getSessionBalance(ctx, db, tableSessionId);
  if (!balance) return null;
  if (balance.status !== 'open') {
    return { error: 'ALREADY_CLOSED' as const };
  }
  if (balance.balance > 0) {
    return { error: 'BALANCE_REMAINING' as const, balance: balance.balance };
  }

  await db
    .update(tableSessions)
    .set({ status: 'closed', closedAt: nowMs() })
    .where(and(eq(tableSessions.id, tableSessionId), eq(tableSessions.storeId, ctx.storeId)));

  return { ok: true as const };
}

export async function listOpenSessions(ctx: StoreContext, db: Db) {
  return db
    .select({
      id: tableSessions.id,
      tableId: tableSessions.tableId,
      tableName: diningTables.name,
      openedAt: tableSessions.openedAt,
    })
    .from(tableSessions)
    .innerJoin(diningTables, eq(diningTables.id, tableSessions.tableId))
    .where(and(eq(tableSessions.storeId, ctx.storeId), eq(tableSessions.status, 'open')));
}
