'use client';

import { formatCurrency, toBillingCurrency } from '@taomenu/shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type CartLineSelection,
  cartLineKey,
  ModifierPicker,
  type PublicMenuItem,
} from '../../../modifier-picker';
import { addToCart, type CartLine, cartSubtotal } from './customer-cart';
import { CustomerMenuList } from './customer-menu-list';
import { CustomerOrderView, type OrderStatusView } from './customer-order-view';

type MenuPayload = {
  availableLocales: string[];
  resolvedLocale: string;
  store: { name: string; currency: string; acceptingPublicRequests: boolean; menuVersion: number };
  table?: { name: string };
  categories: Array<{
    id: string;
    name: string;
    items: PublicMenuItem[];
  }>;
};

type CustomerMenuProps = {
  tableToken: string;
};

export function CustomerMenu({ tableToken }: CustomerMenuProps) {
  const t = useTranslations('customer');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedLocale = searchParams.get('locale') ?? locale;
  const [menu, setMenu] = useState<MenuPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<OrderStatusView | null>(null);
  const [svcBusy, setSvcBusy] = useState(false);
  const [svcMsg, setSvcMsg] = useState<string | null>(null);
  const [picking, setPicking] = useState<PublicMenuItem | null>(null);

  const loadMenu = useCallback(async () => {
    setError(null);
    const res = await fetch(
      `/api/public/tables/${encodeURIComponent(tableToken)}/menu?locale=${encodeURIComponent(requestedLocale)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) {
      setError(t('notFoundTable'));
      return;
    }
    setMenu((await res.json()) as MenuPayload);
  }, [requestedLocale, tableToken, t]);

  function changeMenuLocale(nextLocale: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('locale', nextLocale);
    router.replace(`?${params.toString()}`);
  }

  const refreshOrder = useCallback(async (publicToken: string) => {
    const res = await fetch(`/api/public/orders/${encodeURIComponent(publicToken)}`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      displayNumber: number;
      status: string;
      subtotalAmount: number;
      items: Array<{ name: string; quantity: number; lineTotalAmount: number }>;
    };
    setOrder({
      publicToken,
      displayNumber: data.displayNumber,
      status: data.status,
      subtotalAmount: data.subtotalAmount,
      items: data.items,
    });
  }, []);

  useEffect(() => {
    void loadMenu();
    try {
      const raw = localStorage.getItem('taomenu.lastOrder');
      if (raw) {
        const parsed = JSON.parse(raw) as { publicToken?: string };
        if (parsed.publicToken) {
          void refreshOrder(parsed.publicToken);
        }
      }
    } catch {
      // ignore
    }
  }, [loadMenu, refreshOrder]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') void loadMenu();
    }
    function onPageShow() {
      void loadMenu();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [loadMenu]);

  // 后台不轮询：切回前台 / pageshow / 下拉时刷新
  useEffect(() => {
    if (!order?.publicToken) return;

    function onVisible() {
      if (document.visibilityState === 'visible' && order?.publicToken) {
        void refreshOrder(order.publicToken);
      }
    }
    function onPageShow() {
      if (order?.publicToken) void refreshOrder(order.publicToken);
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [order?.publicToken, refreshOrder]);

  const subtotal = useMemo(() => cartSubtotal(cart), [cart]);

  // 订单状态页可能先于菜单渲染（从 localStorage 恢复订单），此时按 VND 回落
  const currency = toBillingCurrency(menu?.store.currency);

  function requestAddItem(item: PublicMenuItem) {
    if (item.modifierGroups && item.modifierGroups.length > 0) {
      setPicking(item);
      return;
    }
    commitSelection({
      menuItemId: item.id,
      name: item.name,
      priceAmount: item.priceAmount,
      modifierIds: [],
      lineKey: cartLineKey(item.id, []),
    });
  }

  function commitSelection(selection: Omit<CartLineSelection, 'quantity'>) {
    setCart((prev) => addToCart(prev, selection));
    setPicking(null);
  }

  async function submitOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const idempotencyKey =
        globalThis.crypto?.randomUUID?.() ?? `idemp-${Date.now()}-${Math.random()}`;
      const res = await fetch(`/api/public/tables/${encodeURIComponent(tableToken)}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey,
          lines: cart.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            modifierIds: l.modifierIds,
          })),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        displayNumber?: number;
        publicToken?: string;
        subtotalAmount?: number;
      };
      if (!res.ok || data.displayNumber === undefined || !data.publicToken) {
        if (data.code === 'PAUSED') {
          setMenu((current) =>
            current
              ? { ...current, store: { ...current.store, acceptingPublicRequests: false } }
              : current,
          );
          setError(t('pausedCart'));
        } else {
          setError(data.error || t('orderFailed'));
        }
        return;
      }
      setCart([]);
      try {
        localStorage.setItem(
          'taomenu.lastOrder',
          JSON.stringify({ publicToken: data.publicToken, at: Date.now() }),
        );
      } catch {
        // ignore
      }
      await refreshOrder(data.publicToken);
    } finally {
      setSubmitting(false);
    }
  }

  async function sendService(type: 'call_staff' | 'request_bill') {
    setSvcBusy(true);
    setSvcMsg(null);
    try {
      const idempotencyKey =
        globalThis.crypto?.randomUUID?.() ?? `svc-${Date.now()}-${Math.random()}`;
      const res = await fetch(
        `/api/public/tables/${encodeURIComponent(tableToken)}/service-requests`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, idempotencyKey }),
        },
      );
      const data = (await res.json()) as { error?: string; status?: string; reused?: boolean };
      if (!res.ok) {
        setSvcMsg(data.error || t('requestFailed'));
        return;
      }
      setSvcMsg(
        type === 'request_bill'
          ? data.reused
            ? t('billPending')
            : t('billSent')
          : data.reused
            ? t('staffPending')
            : t('staffSent'),
      );
    } finally {
      setSvcBusy(false);
    }
  }

  if (!menu && !order) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        {error || t('loading')}
      </div>
    );
  }

  if (order && !cart.length) {
    return (
      <CustomerOrderView
        order={order}
        storeName={menu?.store.name ?? 'TaoMenu'}
        currency={currency}
        svcBusy={svcBusy}
        svcMsg={svcMsg}
        onRefresh={() => void refreshOrder(order.publicToken)}
        onOrderMore={() => setOrder(null)}
        onSendService={(type) => void sendService(type)}
      />
    );
  }

  if (!menu) {
    return null;
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-28">
      <CustomerMenuList
        storeName={menu.store.name}
        tableName={menu.table?.name}
        acceptingPublicRequests={menu.store.acceptingPublicRequests}
        categories={menu.categories}
        currency={currency}
        availableLocales={menu.availableLocales}
        resolvedLocale={menu.resolvedLocale}
        onLocaleChange={changeMenuLocale}
        svcBusy={svcBusy}
        svcMsg={svcMsg}
        onSendService={(type) => void sendService(type)}
        onPickItem={requestAddItem}
      />

      {error ? <p className="px-4 pt-3 text-sm font-medium text-brand-600">{error}</p> : null}

      {cart.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg">
          <div className="mx-auto max-w-lg space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-ink-900">{t('cartReview')}</p>
              <p className="text-sm font-bold tabular-nums text-ink-900">
                {formatCurrency(subtotal, currency, locale)}
              </p>
            </div>
            <ul className="max-h-24 space-y-1 overflow-y-auto text-xs text-muted-foreground">
              {cart.map((line) => (
                <li key={line.lineKey} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {line.quantity}× {line.name}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatCurrency(line.priceAmount * line.quantity, currency, locale)}
                  </span>
                </li>
              ))}
            </ul>
            {!menu.store.acceptingPublicRequests ? (
              <p className="text-xs font-semibold text-brand-700" role="status">
                {t('pausedCart')}
              </p>
            ) : null}
            <button
              type="button"
              disabled={submitting || !menu.store.acceptingPublicRequests}
              onClick={() => void submitOrder()}
              className="min-h-12 w-full rounded-xl bg-brand-600 px-5 text-sm font-bold text-white disabled:bg-paper-100 disabled:text-muted-foreground"
            >
              {submitting
                ? t('sending')
                : t('sendWithPrice', { price: formatCurrency(subtotal, currency, locale) })}
            </button>
          </div>
        </div>
      ) : null}

      {picking ? (
        <ModifierPicker
          item={picking}
          currency={currency}
          onCancel={() => setPicking(null)}
          onConfirm={commitSelection}
        />
      ) : null}
    </div>
  );
}
