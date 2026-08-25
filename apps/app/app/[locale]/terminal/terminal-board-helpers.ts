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
  items: Array<{ name: string; quantity: number }>;
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
