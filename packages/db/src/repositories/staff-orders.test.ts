import { describe, expect, it } from 'vitest';
import { type OrderStatus, orders } from '../schema/tables-orders';
import { seedStore } from '../testing/agent-fixtures';
import { createTestDb } from '../testing/memory-d1';
import type { Db, StoreContext } from '../types';
import {
  canTransition,
  isOrderVisibleInWorkbench,
  listOrderWorkbench,
  transitionOrder,
} from './staff-orders';

describe('canTransition', () => {
  it('堂食 submitted → accepted → served', () => {
    expect(canTransition('submitted', 'accepted', 'dine_in')).toBe(true);
    expect(canTransition('accepted', 'served', 'dine_in')).toBe(true);
    expect(canTransition('submitted', 'served', 'dine_in')).toBe(false);
  });

  it('外带 ready_for_pickup → picked_up', () => {
    expect(canTransition('accepted', 'ready_for_pickup', 'pickup')).toBe(true);
    expect(canTransition('ready_for_pickup', 'picked_up', 'pickup')).toBe(true);
    expect(canTransition('accepted', 'served', 'pickup')).toBe(false);
  });

  it('允许取消进行中订单', () => {
    expect(canTransition('submitted', 'cancelled', 'dine_in')).toBe(true);
    expect(canTransition('served', 'cancelled', 'dine_in')).toBe(false);
  });
});

describe('isOrderVisibleInWorkbench', () => {
  it('进行中订单即使已付款仍保留到履约完成', () => {
    expect(isOrderVisibleInWorkbench('accepted', 0)).toBe(true);
  });

  it('已完成未付款订单保留，付清后移出工作台', () => {
    expect(isOrderVisibleInWorkbench('served', 2_000)).toBe(true);
    expect(isOrderVisibleInWorkbench('served', 0)).toBe(false);
    expect(isOrderVisibleInWorkbench('picked_up', 0)).toBe(false);
  });
});

describe('transitionOrder（真实 SQL，issue #21）', () => {
  async function seedPickupOrder(db: Db, status: OrderStatus, note: string | null = null) {
    const now = new Date();
    await db.insert(orders).values({
      id: 'order-2',
      publicTokenHash: 'hash',
      idempotencyKey: 'idem-2',
      storeId: 'paris',
      fulfillmentMode: 'pickup',
      displayNumber: 2,
      pickupNumber: 2,
      businessDate: '2026-11-14',
      status,
      subtotalAmount: 450,
      note,
      createdAt: now,
      updatedAt: now,
    });
  }

  const ctx: StoreContext = {
    storeId: 'paris',
    userId: 'owner',
    role: 'owner',
    plan: 'free',
    staffSeatAddons: 0,
  };

  it('外带单 已接单 → 可取餐 → 已取餐 会真正落库', async () => {
    const db = createTestDb();
    await seedStore(db, 'paris', { currency: 'USD' });
    await seedPickupOrder(db, 'accepted');

    expect(await transitionOrder(ctx, db, 'order-2', 'ready_for_pickup')).toEqual({
      ok: true,
      status: 'ready_for_pickup',
    });
    const [afterReady] = await listOrderWorkbench(ctx, db);
    expect(afterReady?.status).toBe('ready_for_pickup');

    expect(await transitionOrder(ctx, db, 'order-2', 'picked_up')).toEqual({
      ok: true,
      status: 'picked_up',
    });
  });

  it('重复提交同一流转返回 INVALID_TRANSITION，而不是静默成功', async () => {
    const db = createTestDb();
    await seedStore(db, 'paris', { currency: 'USD' });
    await seedPickupOrder(db, 'ready_for_pickup');

    expect(await transitionOrder(ctx, db, 'order-2', 'ready_for_pickup')).toEqual({
      error: 'INVALID_TRANSITION',
    });
  });

  it('不能操作其他门店的订单', async () => {
    const db = createTestDb();
    await seedStore(db, 'paris', { currency: 'USD' });
    await seedPickupOrder(db, 'accepted');

    expect(
      await transitionOrder({ ...ctx, storeId: 'other' }, db, 'order-2', 'ready_for_pickup'),
    ).toBeNull();
  });

  it('工作台返回顾客备注（issue #22）', async () => {
    const db = createTestDb();
    await seedStore(db, 'paris', { currency: 'USD' });
    await seedPickupOrder(db, 'submitted', '不要香菜');

    const [card] = await listOrderWorkbench(ctx, db);
    expect(card?.note).toBe('不要香菜');
  });
});
