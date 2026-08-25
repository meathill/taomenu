'use client';

import { formatCurrency } from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import type { OrderCard, ServiceCard, SessionCard } from './terminal-board-helpers';
import {
  TerminalOrderSection,
  TerminalRequestSection,
  TerminalSessionSection,
} from './terminal-board-sections';

type TerminalBoardProps = {
  storeId: string;
  currency: string;
};

export function TerminalBoard({ storeId, currency }: TerminalBoardProps) {
  const t = useTranslations('terminal');
  const locale = useLocale();
  const [orders, setOrders] = useState<OrderCard[]>([]);
  const [requests, setRequests] = useState<ServiceCard[]>([]);
  const [sessions, setSessions] = useState<SessionCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [oRes, sRes, sessRes] = await Promise.all([
        fetch(`/api/owner/stores/${storeId}/orders`, { cache: 'no-store' }),
        fetch(`/api/owner/stores/${storeId}/service-requests`, { cache: 'no-store' }),
        fetch(`/api/owner/stores/${storeId}/sessions`, { cache: 'no-store' }),
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
    } catch {
      setError(t('loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [storeId, t]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [load]);

  async function transition(orderId: string, status: string) {
    setBusyId(orderId);
    setError(null);
    setMessage(null);
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
    setError(null);
    setMessage(null);
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
    setError(null);
    setMessage(null);
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
      setMessage(t('paymentRecorded'));
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function closeSession(sessionId: string) {
    setBusyId(`close-${sessionId}`);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/sessions/${sessionId}/close`, {
        method: 'POST',
      });
      const data = (await res.json()) as { error?: string; balance?: number };
      if (!res.ok) {
        setError(
          data.error === 'BALANCE_REMAINING'
            ? t('balanceDue', { amount: formatCurrency(data.balance ?? 0, currency, locale) })
            : data.error || t('closeFailed'),
        );
        return;
      }
      setMessage(t('tableClosed'));
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function refresh() {
    setBusyId('refresh');
    setError(null);
    try {
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm font-medium text-brand-600">{error}</p> : null}
      {message ? (
        <p className="text-sm font-semibold text-jade-700" role="status">
          {message}
        </p>
      ) : null}

      <TerminalRequestSection
        requests={requests}
        busyId={busyId}
        onTransitionService={(id, status) => void transitionService(id, status)}
      />

      <TerminalOrderSection
        orders={orders}
        currency={currency}
        isLoading={isLoading}
        busyId={busyId}
        onTransition={(id, status) => void transition(id, status)}
        onPay={(id, amount) => void payOrder(id, amount)}
        onRefresh={() => void refresh()}
      />

      <TerminalSessionSection
        sessions={sessions}
        currency={currency}
        busyId={busyId}
        onClose={(id) => void closeSession(id)}
      />
    </div>
  );
}
