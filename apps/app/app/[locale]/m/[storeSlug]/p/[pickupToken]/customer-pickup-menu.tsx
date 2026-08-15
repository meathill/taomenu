'use client';

import { formatCurrency, toBillingCurrency } from '@taomenu/shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { publicMediaPath } from '@/lib/menu-image';
import {
  type CartLineSelection,
  cartLineKey,
  ModifierPicker,
  type PublicMenuItem,
} from '../../../modifier-picker';
import { CustomerLanguageSelect } from '../../customer-language-select';

type MenuPayload = {
  availableLocales: string[];
  resolvedLocale: string;
  store: { name: string; currency: string; acceptingPublicRequests: boolean };
  pickupPoint?: { name: string };
  categories: Array<{
    id: string;
    name: string;
    items: PublicMenuItem[];
  }>;
};

type CartLine = CartLineSelection & { quantity: number };

export function CustomerPickupMenu({ pickupToken }: { pickupToken: string }) {
  const t = useTranslations('customer');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedLocale = searchParams.get('locale') ?? locale;
  const [menu, setMenu] = useState<MenuPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
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
    const res = await fetch(
      `/api/public/pickup-points/${encodeURIComponent(pickupToken)}/menu?locale=${encodeURIComponent(requestedLocale)}`,
      { cache: 'no-store' },
    );
    if (!res.ok) {
      setError(t('notFoundPickup'));
      return;
    }
    setMenu((await res.json()) as MenuPayload);
  }, [pickupToken, requestedLocale, t]);

  function changeMenuLocale(nextLocale: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('locale', nextLocale);
    router.replace(`?${params.toString()}`);
  }

  useEffect(() => {
    void load();
  }, [load]);

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.priceAmount * line.quantity, 0),
    [cart],
  );

  // 下单结果页在菜单请求失败时仍会渲染，此时按 VND 回落
  const currency = toBillingCurrency(menu?.store.currency);

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
    setCart((prev) => {
      const existing = prev.find((l) => l.lineKey === selection.lineKey);
      if (existing) {
        return prev.map((l) =>
          l.lineKey === selection.lineKey ? { ...l, quantity: Math.min(99, l.quantity + 1) } : l,
        );
      }
      return [...prev, { ...selection, quantity: 1 }];
    });
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
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!result?.publicToken) return;
    function refresh() {
      if (!result?.publicToken) return;
      void fetch(`/api/public/orders/${encodeURIComponent(result.publicToken)}`)
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
    function onVisible() {
      if (document.visibilityState === 'visible') refresh();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', refresh);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', refresh);
    };
  }, [result?.publicToken]);

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
      <div className="mx-auto max-w-lg px-4 py-8 text-center">
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
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        {error || t('loading')}
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-28">
      <header className="sticky top-0 z-10 border-b border-border bg-paper-50/95 px-4 py-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-600">{menu.store.name}</p>
            <h1 className="text-xl font-extrabold text-ink-900">
              {menu.pickupPoint?.name ?? t('pickupMode')}
            </h1>
          </div>
          <CustomerLanguageSelect
            availableLocales={menu.availableLocales}
            resolvedLocale={menu.resolvedLocale}
            onChange={changeMenuLocale}
          />
        </div>
        {!menu.store.acceptingPublicRequests ? (
          <p className="mt-1 text-xs font-semibold text-brand-600">{t('paused')}</p>
        ) : null}
      </header>
      {error ? <p className="px-4 pt-3 text-sm font-medium text-brand-600">{error}</p> : null}
      <ul className="space-y-6 px-4 py-4">
        {menu.categories.map((category) => (
          <li key={category.id}>
            <h2 className="mb-2 text-sm font-bold text-terracotta-600 uppercase">
              {category.name}
            </h2>
            <ul className="space-y-2">
              {category.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={item.isSoldOut || !menu.store.acceptingPublicRequests}
                    onClick={() => requestAddItem(item)}
                    className="flex min-h-14 w-full items-center justify-between rounded-2xl border border-border bg-white px-4 py-3 text-left disabled:opacity-50"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      {item.imageKey ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={publicMediaPath(item.imageKey)}
                          alt=""
                          className="size-12 shrink-0 rounded-xl object-cover"
                          loading="lazy"
                        />
                      ) : null}
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{item.name}</span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatCurrency(item.priceAmount, currency, locale)}
                          {(item.modifierGroups?.length ?? 0) > 0 ? ` · ${t('options')}` : ''}
                        </span>
                      </span>
                    </span>
                    <span className="font-bold text-brand-600">+</span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {cart.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto mb-3 max-w-lg">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-ink-900">{t('cartReview')}</p>
              <p className="text-sm font-bold tabular-nums text-ink-900">
                {formatCurrency(subtotal, currency, locale)}
              </p>
            </div>
            <ul className="mt-2 max-h-24 space-y-1 overflow-y-auto text-xs text-muted-foreground">
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
              <p className="mt-2 text-xs font-semibold text-brand-700" role="status">
                {t('pausedCart')}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={submitting || !menu.store.acceptingPublicRequests}
            onClick={() => void submitOrder()}
            className="mx-auto min-h-12 w-full max-w-lg rounded-xl bg-brand-600 text-sm font-bold text-white disabled:bg-paper-100 disabled:text-muted-foreground"
          >
            {submitting
              ? t('sending')
              : t('sendWithPrice', { price: formatCurrency(subtotal, currency, locale) })}
          </button>
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
