'use client';

import { formatVnd } from '@taomenu/shared';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/button';

type OrderCard = {
  id: string;
  status: string;
  fulfillmentMode: string;
  displayNumber: number;
  pickupNumber: number | null;
  tableId: string | null;
  subtotalAmount: number;
  items: Array<{ name: string; quantity: number }>;
};

type ServiceCard = {
  id: string;
  type: string;
  status: string;
  tableName: string;
};

type SessionCard = {
  id: string;
  tableId: string;
  balance: { ordered: number; paid: number; balance: number } | null;
};

type TerminalBoardProps = {
  storeId: string;
};

type ActionKey = 'accept' | 'served' | 'readyPickup' | 'pickedUp';

function nextAction(order: OrderCard): { labelKey: ActionKey; status: string } | null {
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

const ORDER_STATUS_KEYS: Record<string, string> = {
  submitted: 'statusSubmitted',
  accepted: 'statusAccepted',
  served: 'statusServed',
  ready_for_pickup: 'statusReadyForPickup',
  picked_up: 'statusPickedUp',
  cancelled: 'statusCancelled',
};

const REQUEST_STATUS_KEYS: Record<string, string> = {
  open: 'reqStatusOpen',
  acknowledged: 'reqStatusAcknowledged',
};

export function TerminalBoard({ storeId }: TerminalBoardProps) {
  const t = useTranslations('terminal');
  const [orders, setOrders] = useState<OrderCard[]>([]);
  const [requests, setRequests] = useState<ServiceCard[]>([]);
  const [sessions, setSessions] = useState<SessionCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [oRes, sRes, sessRes] = await Promise.all([
      fetch(`/api/owner/stores/${storeId}/orders`),
      fetch(`/api/owner/stores/${storeId}/service-requests`),
      fetch(`/api/owner/stores/${storeId}/sessions`),
    ]);
    if (!oRes.ok) {
      setError(t('loadFailed'));
      return;
    }
    const oData = (await oRes.json()) as { orders: OrderCard[] };
    setOrders(oData.orders);
    if (sRes.ok) {
      const sData = (await sRes.json()) as { requests: ServiceCard[] };
      setRequests(sData.requests);
    }
    if (sessRes.ok) {
      const sessData = (await sessRes.json()) as { sessions: SessionCard[] };
      setSessions(sessData.sessions);
    }
    setError(null);
  }, [storeId, t]);

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
        setError(t('updateFailed'));
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function transitionService(requestId: string, status: string) {
    setBusyId(`${requestId}-${status}`);
    try {
      const res = await fetch(
        `/api/owner/stores/${storeId}/service-requests/${requestId}/transition`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        },
      );
      if (!res.ok) {
        setError(t('requestUpdateFailed'));
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function payOrder(orderId: string, amount: number) {
    setBusyId(`pay-${orderId}`);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, method: 'cash', amount }),
      });
      if (!res.ok) {
        setError(t('paymentFailed'));
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function closeSession(sessionId: string) {
    setBusyId(`close-${sessionId}`);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/sessions/${sessionId}/close`, {
        method: 'POST',
      });
      const data = (await res.json()) as { error?: string; balance?: number };
      if (!res.ok) {
        setError(
          data.error === 'BALANCE_REMAINING'
            ? t('balanceDue', { amount: formatVnd(data.balance ?? 0) })
            : data.error || t('closeFailed'),
        );
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm font-medium text-brand-600">{error}</p> : null}

      {requests.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-ink-900">{t('requests')}</h2>
          <ul className="space-y-2">
            {requests.map((req) => (
              <li
                key={req.id}
                className="rounded-2xl border border-gold-600 bg-white p-4 shadow-sm"
              >
                <p className="font-bold text-ink-900">
                  {t('tableLabel', { name: req.tableName })} ·{' '}
                  {req.type === 'request_bill' ? t('requestBill') : t('callStaff')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const key = REQUEST_STATUS_KEYS[req.status];
                    return key ? t(key) : req.status;
                  })()}
                </p>
                <div className="mt-3 flex gap-2">
                  {req.status === 'open' ? (
                    <Button
                      type="button"
                      pending={busyId === `${req.id}-acknowledged`}
                      busy={busyId !== null}
                      onClick={() => void transitionService(req.id, 'acknowledged')}
                      className="min-h-11 flex-1 rounded-xl bg-jade-600 text-xs font-bold text-white"
                    >
                      {t('ack')}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    pending={busyId === `${req.id}-resolved`}
                    busy={busyId !== null}
                    onClick={() => void transitionService(req.id, 'resolved')}
                    className="min-h-11 flex-1 rounded-xl border border-border text-xs font-bold"
                  >
                    {t('done')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('openOrders', { count: orders.length })}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="text-sm font-semibold text-jade-600"
          >
            {t('refresh')}
          </button>
        </div>
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
            <p className="text-4xl font-extrabold tabular-nums text-gold-600">0</p>
            <p className="mt-2 text-sm font-semibold text-ink-900">{t('noOrdersTitle')}</p>
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
                        {order.fulfillmentMode === 'pickup' ? t('pickup') : t('dineIn')} · {(() => {
                          const key = ORDER_STATUS_KEYS[order.status];
                          return key ? t(key) : order.status;
                        })()}
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
                  <div className="mt-3 grid gap-2">
                    {action ? (
                      <Button
                        type="button"
                        pending={busyId === order.id}
                        onClick={() => void transition(order.id, action.status)}
                        className="min-h-12 w-full rounded-xl bg-jade-600 text-sm font-bold text-white"
                      >
                        {t(action.labelKey)}
                      </Button>
                    ) : null}
                    {(order.status === 'served' ||
                      order.status === 'picked_up' ||
                      order.status === 'ready_for_pickup' ||
                      order.status === 'accepted') && (
                      <Button
                        type="button"
                        pending={busyId === `pay-${order.id}`}
                        onClick={() => void payOrder(order.id, order.subtotalAmount)}
                        className="min-h-11 w-full rounded-xl border border-border text-xs font-bold"
                      >
                        {t('recordCash')}
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {sessions.some((s) => (s.balance?.balance ?? 0) <= 0) ? (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-ink-900">{t('closeSection')}</h2>
          <ul className="space-y-2">
            {sessions
              .filter((s) => s.balance && s.balance.balance <= 0)
              .map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3"
                >
                  <span className="text-sm">{t('sessionLabel', { id: s.id.slice(0, 8) })}</span>
                  <Button
                    type="button"
                    pending={busyId === `close-${s.id}`}
                    onClick={() => void closeSession(s.id)}
                    className="min-h-10 rounded-xl bg-jade-600 px-3 text-xs font-bold text-white"
                  >
                    {t('closeTable')}
                  </Button>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
