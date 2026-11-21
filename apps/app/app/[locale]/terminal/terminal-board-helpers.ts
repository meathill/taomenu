export type OrderCard = {
  id: string;
  status: string;
  fulfillmentMode: string;
  displayNumber: number;
  pickupNumber: number | null;
  tableId: string | null;
  subtotalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  /** 顾客下单备注（忌口、少辣等） */
  note?: string | null;
  items: Array<{ name: string; quantity: number; lineTotalAmount?: number | null }>;
};

export type ServiceCard = {
  id: string;
  type: string;
  status: string;
  tableName: string;
};

export type SessionCard = {
  id: string;
  tableId: string;
  tableName: string;
  balance: { ordered: number; paid: number; balance: number } | null;
};

export type ActionKey = 'accept' | 'served' | 'readyPickup' | 'pickedUp';

export function nextAction(order: OrderCard): { labelKey: ActionKey; status: string } | null {
  if (order.status === 'submitted') return { labelKey: 'accept', status: 'accepted' };
  if (order.fulfillmentMode === 'dine_in' && order.status === 'accepted') {
    return { labelKey: 'served', status: 'served' };
  }
  if (order.fulfillmentMode === 'pickup' && order.status === 'accepted') {
    return { labelKey: 'readyPickup', status: 'ready_for_pickup' };
  }
  if (order.status === 'ready_for_pickup') {
    return { labelKey: 'pickedUp', status: 'picked_up' };
  }
  return null;
}

export const ORDER_STATUS_KEYS: Record<string, string> = {
  submitted: 'statusSubmitted',
  accepted: 'statusAccepted',
  served: 'statusServed',
  ready_for_pickup: 'statusReadyForPickup',
  picked_up: 'statusPickedUp',
  cancelled: 'statusCancelled',
};

export const REQUEST_STATUS_KEYS: Record<string, string> = {
  open: 'reqStatusOpen',
  acknowledged: 'reqStatusAcknowledged',
};

export type TransitionFailureKey = 'statusChanged' | 'sessionExpired' | 'updateFailed';

/** 把状态流转接口的失败映射成店员能看懂的提示。 */
export function transitionFailureKey(
  httpStatus: number,
  errorCode: string | undefined,
): TransitionFailureKey {
  if (httpStatus === 401) return 'sessionExpired';
  if (errorCode === 'INVALID_TRANSITION') return 'statusChanged';
  return 'updateFailed';
}

/**
 * 只采纳最后一次发起的加载结果。
 * 轮询与操作后的刷新会并发；先发出的旧请求晚到时不能覆盖新状态，
 * 否则卡片会回到旧状态，店员再点按钮就会提交过期的流转（issue #21）。
 */
export function createLatestGate() {
  let latest = 0;
  return {
    begin(): number {
      latest += 1;
      return latest;
    },
    isLatest(id: number): boolean {
      return id === latest;
    },
  };
}

/** 对比两次订单快照，找出新出现的订单。首次快照返回空，避免进页就当成新单提醒。 */
export function idsOfNewOrders(
  previousIds: Set<string> | null,
  current: Array<{ id: string }>,
): string[] {
  if (!previousIds) return [];
  return current.filter((order) => !previousIds.has(order.id)).map((order) => order.id);
}
