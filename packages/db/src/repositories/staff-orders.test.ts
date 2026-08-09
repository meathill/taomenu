import { describe, expect, it } from 'vitest';
import { canTransition, isOrderVisibleInWorkbench } from './staff-orders';

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
