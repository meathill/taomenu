'use client';

import { formatVnd } from '@taomenu/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';

type MenuPayload = {
  store: { name: string; acceptingPublicRequests: boolean; menuVersion: number };
  table?: { name: string };
  categories: Array<{
    id: string;
    name: string;
    items: Array<{
      id: string;
      name: string;
      priceAmount: number;
      isSoldOut: boolean;
    }>;
  }>;
};

type CartLine = { menuItemId: string; name: string; priceAmount: number; quantity: number };

type CustomerMenuProps = {
  tableToken: string;
};

export function CustomerMenu({ tableToken }: CustomerMenuProps) {
  const [menu, setMenu] = useState<MenuPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{
    displayNumber: number;
    publicToken: string;
    subtotalAmount: number;
  } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/public/tables/${encodeURIComponent(tableToken)}/menu`);
    if (!res.ok) {
      setError('Không tìm thấy bàn hoặc menu.');
      return;
    }
    setMenu((await res.json()) as MenuPayload);
  }, [tableToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.priceAmount * line.quantity, 0),
    [cart],
  );

  function addItem(item: MenuPayload['categories'][number]['items'][number]) {
    if (item.isSoldOut) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.menuItemId === item.id);
      if (existing) {
        return prev.map((l) =>
          l.menuItemId === item.id ? { ...l, quantity: Math.min(99, l.quantity + 1) } : l,
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          priceAmount: item.priceAmount,
          quantity: 1,
        },
      ];
    });
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
          lines: cart.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        displayNumber?: number;
        publicToken?: string;
        subtotalAmount?: number;
      };
      if (!res.ok || data.displayNumber === undefined || !data.publicToken) {
        setError(data.error || 'Gửi order thất bại.');
        return;
      }
      setOrderResult({
        displayNumber: data.displayNumber,
        publicToken: data.publicToken,
        subtotalAmount: data.subtotalAmount ?? subtotal,
      });
      setCart([]);
      try {
        localStorage.setItem(
          'taomenu.lastOrder',
          JSON.stringify({ publicToken: data.publicToken, at: Date.now() }),
        );
      } catch {
        // ignore
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (orderResult) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <p className="text-sm font-semibold text-brand-600">Đã gửi order</p>
        <h1 className="mt-2 text-3xl font-extrabold tabular-nums text-ink-900">
          #{orderResult.displayNumber}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tổng {formatVnd(orderResult.subtotalAmount)}. Nhân viên sẽ xác nhận trên terminal.
        </p>
        <button
          type="button"
          className="mt-6 min-h-12 w-full rounded-xl bg-brand-600 text-sm font-bold text-white"
          onClick={() => setOrderResult(null)}
        >
          Order thêm
        </button>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        {error || 'Đang tải menu…'}
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-28">
      <header className="sticky top-0 z-10 border-b border-border bg-paper-50/95 px-4 py-4 backdrop-blur">
        <p className="text-sm font-semibold text-brand-600">{menu.store.name}</p>
        <h1 className="text-xl font-extrabold text-ink-900">
          {menu.table ? `Bàn ${menu.table.name}` : 'Menu'}
        </h1>
        {!menu.store.acceptingPublicRequests ? (
          <p className="mt-1 text-xs font-semibold text-brand-600">Tạm ngưng nhận order</p>
        ) : null}
      </header>

      {error ? <p className="px-4 pt-3 text-sm font-medium text-brand-600">{error}</p> : null}

      {menu.categories.length === 0 ? (
        <p className="px-4 py-8 text-sm text-muted-foreground">Menu chưa được xuất bản.</p>
      ) : (
        <ul className="space-y-6 px-4 py-4">
          {menu.categories.map((category) => (
            <li key={category.id}>
              <h2 className="mb-2 text-sm font-bold tracking-wide text-terracotta-600 uppercase">
                {category.name}
              </h2>
              <ul className="space-y-2">
                {category.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={item.isSoldOut || !menu.store.acceptingPublicRequests}
                      onClick={() => addItem(item)}
                      className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-left disabled:opacity-50"
                    >
                      <span>
                        <span className="block font-semibold text-ink-900">{item.name}</span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatVnd(item.priceAmount)}
                          {item.isSoldOut ? ' · Hết' : ''}
                        </span>
                      </span>
                      <span className="text-sm font-bold text-brand-600">+</span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {cart.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900">
                {cart.reduce((n, l) => n + l.quantity, 0)} món
              </p>
              <p className="text-sm tabular-nums text-muted-foreground">{formatVnd(subtotal)}</p>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submitOrder()}
              className="min-h-12 rounded-xl bg-brand-600 px-5 text-sm font-bold text-white disabled:opacity-60"
            >
              {submitting ? 'Đang gửi…' : 'Gửi order'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
