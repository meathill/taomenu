'use client';

import { formatVnd } from '@taomenu/shared';
import { useCallback, useEffect, useState } from 'react';

type OrderCard = {
  id: string;
  status: string;
  fulfillmentMode: string;
  displayNumber: number;
  pickupNumber: number | null;
  subtotalAmount: number;
  items: Array<{ name: string; quantity: number }>;
};

type TerminalBoardProps = {
  storeId: string;
};

function nextAction(order: OrderCard): { label: string; status: string } | null {
  if (order.status === 'submitted') return { label: 'Nhận', status: 'accepted' };
  if (order.fulfillmentMode === 'dine_in' && order.status === 'accepted') {
    return { label: 'Đã phục vụ', status: 'served' };
  }
  if (order.fulfillmentMode === 'pickup' && order.status === 'accepted') {
    return { label: 'Sẵn sàng lấy', status: 'ready_for_pickup' };
  }
  if (order.status === 'ready_for_pickup') {
    return { label: 'Đã lấy', status: 'picked_up' };
  }
  return null;
}

export function TerminalBoard({ storeId }: TerminalBoardProps) {
  const [orders, setOrders] = useState<OrderCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/owner/stores/${storeId}/orders`);
    if (!res.ok) {
      setError('Không tải được order.');
      return;
    }
    const data = (await res.json()) as { orders: OrderCard[] };
    setOrders(data.orders);
    setError(null);
  }, [storeId]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [load]);

  async function transition(orderId: string, status: string) {
    setBusyId(orderId);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/orders/${orderId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setError('Cập nhật thất bại.');
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm font-medium text-brand-600">{error}</p> : null}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{orders.length} order đang mở</p>
        <button
          type="button"
          onClick={() => void load()}
          className="text-sm font-semibold text-jade-600"
        >
          Làm mới
        </button>
      </div>
      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
          <p className="text-4xl font-extrabold tabular-nums text-gold-600">0</p>
          <p className="mt-2 text-sm font-semibold text-ink-900">Chưa có order mới</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const action = nextAction(order);
            return (
              <li
                key={order.id}
                className="rounded-2xl border border-border bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-2xl font-extrabold tabular-nums text-ink-900">
                      {order.pickupNumber !== null
                        ? `#${String(order.pickupNumber).padStart(2, '0')}`
                        : `#${order.displayNumber}`}
                    </p>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {order.fulfillmentMode === 'pickup' ? 'Lấy món' : 'Tại bàn'} · {order.status}
                    </p>
                  </div>
                  <p className="text-sm font-bold tabular-nums">
                    {formatVnd(order.subtotalAmount)}
                  </p>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-ink-900">
                  {order.items.map((item) => (
                    <li key={`${order.id}-${item.name}`}>
                      <span className="font-semibold tabular-nums">{item.quantity}×</span>{' '}
                      {item.name}
                    </li>
                  ))}
                </ul>
                {action ? (
                  <button
                    type="button"
                    disabled={busyId === order.id}
                    onClick={() => void transition(order.id, action.status)}
                    className="mt-4 min-h-12 w-full rounded-xl bg-jade-600 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {action.label}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
