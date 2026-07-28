import { describe, expect, it } from 'vitest';
import { canTransition } from './staff-orders';

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
