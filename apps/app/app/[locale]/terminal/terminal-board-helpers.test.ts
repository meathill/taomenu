import { describe, expect, it } from 'vitest';
import {
  createLatestGate,
  nextAction,
  type OrderCard,
  transitionFailureKey,
} from './terminal-board-helpers';

function pickupOrder(status: string): OrderCard {
  return {
    id: 'o2',
    status,
    fulfillmentMode: 'pickup',
    displayNumber: 2,
    pickupNumber: 2,
    tableId: null,
    subtotalAmount: 450,
    paidAmount: 0,
    remainingAmount: 450,
    items: [],
  };
}

describe('nextAction', () => {
  it('外带已接单 → 可取餐 → 已取餐', () => {
    expect(nextAction(pickupOrder('accepted'))).toEqual({
      labelKey: 'readyPickup',
      status: 'ready_for_pickup',
    });
    expect(nextAction(pickupOrder('ready_for_pickup'))).toEqual({
      labelKey: 'pickedUp',
      status: 'picked_up',
    });
    expect(nextAction(pickupOrder('picked_up'))).toBeNull();
  });
});

describe('transitionFailureKey', () => {
  it('状态已被别处改动时提示刷新', () => {
    expect(transitionFailureKey(400, 'INVALID_TRANSITION')).toBe('statusChanged');
  });

  it('会话失效与其他错误', () => {
    expect(transitionFailureKey(401, 'Unauthorized')).toBe('sessionExpired');
    expect(transitionFailureKey(500, undefined)).toBe('updateFailed');
    expect(transitionFailureKey(0, undefined)).toBe('updateFailed');
  });
});

describe('createLatestGate', () => {
  it('旧的轮询结果晚到时不得覆盖操作后的新结果', () => {
    const gate = createLatestGate();
    const stalePoll = gate.begin();
    const refreshAfterAction = gate.begin();
    expect(gate.isLatest(refreshAfterAction)).toBe(true);
    expect(gate.isLatest(stalePoll)).toBe(false);
  });
});
