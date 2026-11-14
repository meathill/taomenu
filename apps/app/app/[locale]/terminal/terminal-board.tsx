'use client';

import { formatCurrency } from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { playNewOrderSound, unlockNewOrderSound } from './new-order-cue';
import {
  createLatestGate,
  idsOfNewOrders,
  type OrderCard,
  type ServiceCard,
  type SessionCard,
  transitionFailureKey,
} from './terminal-board-helpers';
import {
  TerminalOrderSection,
  TerminalRequestSection,
  TerminalSessionSection,
} from './terminal-board-sections';

type TerminalBoardProps = {
  storeId: string;
  currency: string;
};

const HIGHLIGHT_MS = 12_000;
const POLL_MS = 5_000;

export function TerminalBoard({ storeId, currency }: TerminalBoardProps) {
  const t = useTranslations('terminal');
  const locale = useLocale();
  const tRef = useRef(t);
  tRef.current = t;
  const [orders, setOrders] = useState<OrderCard[]>([]);
  const [requests, setRequests] = useState<ServiceCard[]>([]);
  const [sessions, setSessions] = useState<SessionCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // 加载失败与操作失败分开：轮询成功只清掉加载错误，不能把店员操作的报错悄悄抹掉
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<{ orderId: string; message: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const loadGate = useRef(createLatestGate());
  const knownOrderIds = useRef<Set<string> | null>(null);
  const highlightTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    const requestId = loadGate.current.begin();
    try {
      const [oRes, sRes, sessRes] = await Promise.all([
        fetch(`/api/owner/stores/${storeId}/orders`, { cache: 'no-store' }),
        fetch(`/api/owner/stores/${storeId}/service-requests`, { cache: 'no-store' }),
        fetch(`/api/owner/stores/${storeId}/sessions`, { cache: 'no-store' }),
      ]);
      if (!loadGate.current.isLatest(requestId)) return;
      if (!oRes.ok) {
        setLoadError(tRef.current('loadFailed'));
        return;
      }
      const oData = (await oRes.json()) as { orders: OrderCard[] };
      const sData = sRes.ok ? ((await sRes.json()) as { requests: ServiceCard[] }) : null;
      const sessData = sessRes.ok ? ((await sessRes.json()) as { sessions: SessionCard[] }) : null;
      if (!loadGate.current.isLatest(requestId)) return;

      const newcomers = idsOfNewOrders(knownOrderIds.current, oData.orders);
      knownOrderIds.current = new Set(oData.orders.map((order) => order.id));
      if (newcomers.length > 0) {
        setHighlightedIds(newcomers);
        playNewOrderSound();
        if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
        highlightTimer.current = window.setTimeout(() => setHighlightedIds([]), HIGHLIGHT_MS);
      }

      setOrders(oData.orders);
      if (sData) setRequests(sData.requests);
      if (sessData) setSessions(sessData.sessions);
      setLoadError(null);
    } catch {
      if (loadGate.current.isLatest(requestId)) setLoadError(tRef.current('loadFailed'));
    } finally {
      // 过期请求不能把「仍在加载」提前关掉，否则会闪一下空列表
      if (loadGate.current.isLatest(requestId)) setIsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    knownOrderIds.current = null;
    setHighlightedIds([]);
    setIsLoading(true);
    setOrders([]);
    setRequests([]);
    setSessions([]);
    void load();

    // 后台标签页的 setInterval 会被节流到分钟级，所以切回前台时立刻再拉一次
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, POLL_MS);

    function refreshIfVisible() {
      if (document.visibilityState === 'visible') void load();
    }
    function onPageShow() {
      void load();
    }

    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
      window.removeEventListener('pageshow', onPageShow);
      if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    };
  }, [load]);

  async function transition(orderId: string, status: string) {
    setBusyId(orderId);
    setError(null);
    setOrderError(null);
    setMessage(null);
    setHighlightedIds((ids) => ids.filter((id) => id !== orderId));
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/orders/${orderId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setOrderError({ orderId, message: t(transitionFailureKey(res.status, data?.error)) });
      }
      // 失败也刷新：状态可能已被其他终端改动，按钮要跟上最新状态
      await load();
    } catch {
      setOrderError({ orderId, message: t('updateFailed') });
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
    <div className="space-y-6" onPointerDown={unlockNewOrderSound}>
      {loadError ? <p className="text-sm font-medium text-brand-600">{loadError}</p> : null}
      {error ? (
        <p className="text-sm font-medium text-brand-600" role="alert">
          {error}
        </p>
      ) : null}
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
        orderError={orderError}
        highlightedIds={highlightedIds}
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
