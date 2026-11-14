'use client';

import { displayPickupPointName, formatCurrency, toStoreCurrency } from '@taomenu/shared';
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
import { CustomerMenuCategories } from '../../../customer-menu-categories';
import { CustomerMenuCover } from '../../../customer-menu-cover';
import { CustomerMenuSkeleton } from '../../../customer-menu-skeleton';
import {
  type CartLineSelection,
  cartLineKey,
  ModifierPicker,
  type PublicMenuItem,
} from '../../../modifier-picker';
import { useCustomerDocumentTitle } from '../../../use-customer-document-title';
import { usePublicMenuLocale, useRequestGeneration } from '../../../use-public-menu-locale';
import { CustomerLanguageSelect } from '../../customer-language-select';

type MenuPayload = {
  availableLocales: string[];
  resolvedLocale: string;
  store: {
    name: string;
    currency: string;
    acceptingPublicRequests: boolean;
    showPoweredBy?: boolean;
    coverImageKey?: string | null;
  };
  pickupPoint?: { name: string };
  categories: Array<{
    id: string;
    name: string;
    items: PublicMenuItem[];
  }>;
};

export function CustomerPickupMenu({ pickupToken }: { pickupToken: string }) {
  const t = useTranslations('customer');
  const locale = useLocale();
  const { menuLocale, changeMenuLocale } = usePublicMenuLocale(locale);
  const beginRequest = useRequestGeneration();
  const [menu, setMenu] = useState<MenuPayload | null>(null);
  useCustomerDocumentTitle(t('pickupMode'), menu?.store.name);
  const [error, setError] = useState<string | null>(null);
  // 菜单加载失败时也显示 Powered by（只有 Pro 主动隐藏才不显示）
  useSyncPoweredByVisibility(menu?.store.showPoweredBy, menu !== null || error !== null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [picking, setPicking] = useState<PublicMenuItem | null>(null);
  const [result, setResult] = useState<{
    pickupNumber: number | null;
    displayNumber: number;
    subtotalAmount: number;
    publicToken?: string;
    status?: string;
  } | null>(null);

  const load = useCallback(async () => {
    const isCurrent = beginRequest();
    const res = await fetch(
      `/api/public/pickup-points/${encodeURIComponent(pickupToken)}/menu?locale=${encodeURIComponent(menuLocale)}`,
      { cache: 'no-store' },
    );
    if (!isCurrent()) return;
    if (!res.ok) {
      setError(t('notFoundPickup'));
      return;
    }
    setMenu((await res.json()) as MenuPayload);
  }, [beginRequest, menuLocale, pickupToken, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const subtotal = useMemo(() => cartSubtotal(cart), [cart]);

  // 下单结果页在菜单请求失败时仍会渲染，此时按 VND 回落
  const currency = toStoreCurrency(menu?.store.currency);

  function requestAddItem(item: PublicMenuItem) {
    if (item.isSoldOut) return;
    if ((item.modifierGroups?.length ?? 0) > 0) {
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
      const res = await fetch(
        `/api/public/pickup-points/${encodeURIComponent(pickupToken)}/orders`,
        {
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
        },
      );
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        pickupNumber?: number | null;
        displayNumber?: number;
        subtotalAmount?: number;
        publicToken?: string;
        status?: string;
      };
      if (!res.ok || data.displayNumber === undefined) {
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
      setResult({
        pickupNumber: data.pickupNumber ?? null,
        displayNumber: data.displayNumber,
        subtotalAmount: data.subtotalAmount ?? subtotal,
        publicToken: data.publicToken,
        status: data.status ?? 'submitted',
      });
      if (data.publicToken) {
        try {
          localStorage.setItem(
            'taomenu.lastPickupOrder',
            JSON.stringify({ publicToken: data.publicToken, at: Date.now() }),
          );
        } catch {
          // ignore
        }
      }
      setCart([]);
      setNote('');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!result?.publicToken) return;
    if (result.status === 'picked_up' || result.status === 'cancelled') return;
    const token = result.publicToken;

    function refresh() {
      void fetch(`/api/public/orders/${encodeURIComponent(token)}`)
        .then((r) =>
          r.ok ? (r.json() as Promise<{ status?: string; pickupNumber?: number | null }>) : null,
        )
        .then((data) => {
          if (!data) return;
          setResult((prev) =>
            prev
              ? {
                  ...prev,
                  status: data.status ?? prev.status,
                  pickupNumber: data.pickupNumber ?? prev.pickupNumber,
                }
              : prev,
          );
        });
    }
    function refreshIfVisible() {
      if (document.visibilityState === 'visible') refresh();
    }

    const timer = window.setInterval(refreshIfVisible, 5000);
    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    window.addEventListener('pageshow', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
      window.removeEventListener('pageshow', refresh);
    };
  }, [result?.publicToken, result?.status]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') void load();
    }
    function onPageShow() {
      void load();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [load]);

  if (result) {
    return (
      <div className="mx-auto w-full min-w-0 max-w-lg px-4 py-8 text-center">
        <p className="text-sm font-semibold text-brand-600">{t('pickupNumber')}</p>
        <p className="mt-2 text-6xl font-extrabold tabular-nums text-ink-900">
          {result.pickupNumber !== null
            ? String(result.pickupNumber).padStart(2, '0')
            : `#${result.displayNumber}`}
        </p>
        <p className="mt-2 text-sm font-bold text-ink-900">
          {result.status === 'ready_for_pickup'
            ? t('statusReady')
            : result.status === 'accepted'
              ? t('statusPreparing')
              : result.status === 'picked_up'
                ? t('statusPickedUp')
                : t('statusSubmitted')}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          {t('pickupSubmittedHint', {
            total: formatCurrency(result.subtotalAmount, currency, locale),
          })}
        </p>
        <button
          type="button"
          className="mt-6 min-h-12 w-full rounded-xl border border-border text-sm font-bold"
          onClick={() => {
            if (result.publicToken) {
              void fetch(`/api/public/orders/${encodeURIComponent(result.publicToken)}`)
                .then((r) => (r.ok ? (r.json() as Promise<{ status?: string }>) : null))
                .then((data) => {
                  if (data?.status) {
                    setResult((prev) => (prev ? { ...prev, status: data.status } : prev));
                  }
                });
            }
          }}
        >
          {t('refreshStatus')}
        </button>
      </div>
    );
  }

  if (!menu) {
    if (error) {
      return <div className="px-4 py-10 text-center text-sm text-muted-foreground">{error}</div>;
    }
    return <CustomerMenuSkeleton label={t('loading')} />;
  }

  return (
    <div
      className={`mx-auto min-h-dvh w-full min-w-0 max-w-lg ${cart.length > 0 ? 'pb-80' : 'pb-28'}`}
    >
      <CustomerMenuCover coverImageKey={menu.store.coverImageKey} />
      <header className="sticky top-0 z-10 border-b border-border bg-paper-50/95 px-4 py-4 backdrop-blur">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-brand-600">{menu.store.name}</p>
            <h1 className="text-xl font-extrabold text-ink-900">
              {displayPickupPointName(menu.pickupPoint?.name, t('defaultPickupPoint'))}
            </h1>
          </div>
          <CustomerLanguageSelect
            availableLocales={menu.availableLocales}
            resolvedLocale={menuLocale}
            onChange={changeMenuLocale}
          />
        </div>
        {!menu.store.acceptingPublicRequests ? (
          <p className="mt-1 text-xs font-semibold text-brand-600">{t('paused')}</p>
        ) : null}
      </header>
      {error ? <p className="px-4 pt-3 text-sm font-medium text-brand-600">{error}</p> : null}
      <CustomerMenuCategories
        categories={menu.categories}
        currency={currency}
        acceptingPublicRequests={menu.store.acceptingPublicRequests}
        onPickItem={requestAddItem}
      />
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
