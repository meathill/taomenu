'use client';

import { toStoreCurrency } from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSyncPoweredByVisibility } from '@/lib/powered-by-visibility';
import {
  addToCart,
  type CartLine,
  cartSubtotal,
  changeCartQuantity,
  normalizeOrderNote,
} from '../../../customer-cart';
import { CustomerCartPanel } from '../../../customer-cart-panel';
import { CustomerItemSheet } from '../../../customer-item-sheet';
import { CustomerMenuSkeleton } from '../../../customer-menu-skeleton';
import {
  type CartLineSelection,
  cartLineKey,
  itemHasRequiredOptions,
  type PublicMenuItem,
} from '../../../modifier-picker';
import { useCustomerDocumentTitle } from '../../../use-customer-document-title';
import { usePublicMenuLocale, useRequestGeneration } from '../../../use-public-menu-locale';
import { CustomerMenuList } from './customer-menu-list';
import { CustomerOrderView, type OrderStatusView } from './customer-order-view';

type MenuPayload = {
  availableLocales: string[];
  resolvedLocale: string;
  store: {
    name: string;
    currency: string;
    acceptingPublicRequests: boolean;
    menuVersion: number;
    showPoweredBy?: boolean;
    coverImageKey?: string | null;
  };
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
  const { menuLocale, changeMenuLocale } = usePublicMenuLocale(locale);
  const beginRequest = useRequestGeneration();
  const [menu, setMenu] = useState<MenuPayload | null>(null);
  useCustomerDocumentTitle(t('menu'), menu?.store.name);
  const [error, setError] = useState<string | null>(null);
  // 菜单加载失败时也显示 Powered by（只有 Pro 主动隐藏才不显示）
  useSyncPoweredByVisibility(menu?.store.showPoweredBy, menu !== null || error !== null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<OrderStatusView | null>(null);
  const [svcBusy, setSvcBusy] = useState(false);
  const [svcMsg, setSvcMsg] = useState<string | null>(null);
  const [picking, setPicking] = useState<PublicMenuItem | null>(null);

  const loadMenu = useCallback(async () => {
    const isCurrent = beginRequest();
    setError(null);
    const res = await fetch(
      `/api/public/tables/${encodeURIComponent(tableToken)}/menu?locale=${encodeURIComponent(menuLocale)}`,
      { cache: 'no-store' },
    );
    if (!isCurrent()) return;
    if (!res.ok) {
      setError(t('notFoundTable'));
      return;
    }
    setMenu((await res.json()) as MenuPayload);
  }, [beginRequest, menuLocale, t, tableToken]);

  const refreshOrder = useCallback(async (publicToken: string) => {
    const res = await fetch(`/api/public/orders/${encodeURIComponent(publicToken)}`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      displayNumber: number;
      status: string;
      subtotalAmount: number;
      items: Array<{ name: string; quantity: number; lineTotalAmount: number | null }>;
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

  // 订单未结束时前台每 5 秒刷新；切回前台 / pageshow 时立刻再拉一次
  useEffect(() => {
    if (!order?.publicToken) return;
    if (order.status === 'served' || order.status === 'picked_up' || order.status === 'cancelled') {
      return;
    }
    const token = order.publicToken;

    function refreshIfVisible() {
      if (document.visibilityState === 'visible') void refreshOrder(token);
    }
    function onPageShow() {
      void refreshOrder(token);
    }

    const timer = window.setInterval(refreshIfVisible, 5000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [order?.publicToken, order?.status, refreshOrder]);

  const subtotal = useMemo(() => cartSubtotal(cart), [cart]);

  // 订单状态页可能先于菜单渲染（从 localStorage 恢复订单），此时按 VND 回落
  const currency = toStoreCurrency(menu?.store.currency);

  function openItem(item: PublicMenuItem) {
    if (item.isSoldOut) return;
    setPicking(item);
  }

  function quickAddItem(item: PublicMenuItem) {
    if (item.isSoldOut) return;
    if (itemHasRequiredOptions(item)) {
      setPicking(item);
      return;
    }
    commitSelection(
      {
        menuItemId: item.id,
        name: item.name,
        priceAmount: item.priceAmount,
        modifierIds: [],
        lineKey: cartLineKey(item.id, []),
      },
      1,
    );
  }

  function commitSelection(selection: Omit<CartLineSelection, 'quantity'>, quantity = 1) {
    setCart((prev) => addToCart(prev, selection, quantity));
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
          note: normalizeOrderNote(note),
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
      setNote('');
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
    if (error) {
      return <div className="px-4 py-10 text-center text-sm text-muted-foreground">{error}</div>;
    }
    return <CustomerMenuSkeleton label={t('loading')} />;
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
    <div
      className={`mx-auto min-h-dvh w-full min-w-0 max-w-lg ${cart.length > 0 ? 'pb-80' : 'pb-28'}`}
    >
      <CustomerMenuList
        storeName={menu.store.name}
        coverImageKey={menu.store.coverImageKey}
        tableName={menu.table?.name}
        acceptingPublicRequests={menu.store.acceptingPublicRequests}
        categories={menu.categories}
        currency={currency}
        availableLocales={menu.availableLocales}
        resolvedLocale={menuLocale}
        onLocaleChange={changeMenuLocale}
        svcBusy={svcBusy}
        svcMsg={svcMsg}
        onSendService={(type) => void sendService(type)}
        onOpenItem={openItem}
        onQuickAddItem={quickAddItem}
      />

      {error ? <p className="px-4 pt-3 text-sm font-medium text-brand-600">{error}</p> : null}

      {cart.length > 0 ? (
        <CustomerCartPanel
          cart={cart}
          subtotal={subtotal}
          currency={currency}
          note={note}
          isAcceptingOrders={menu.store.acceptingPublicRequests}
          isSubmitting={submitting}
          onNoteChange={setNote}
          onChangeQuantity={(lineKey, delta) =>
            setCart((prev) => changeCartQuantity(prev, lineKey, delta))
          }
          onSubmit={() => void submitOrder()}
        />
      ) : null}

      {picking ? (
        <CustomerItemSheet
          item={picking}
          currency={currency}
          onCancel={() => setPicking(null)}
          onConfirm={commitSelection}
        />
      ) : null}
    </div>
  );
}
