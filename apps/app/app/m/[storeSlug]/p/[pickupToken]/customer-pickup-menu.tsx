'use client';

import { formatVnd } from '@taomenu/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';

type MenuPayload = {
  store: { name: string; acceptingPublicRequests: boolean };
  pickupPoint?: { name: string };
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

export function CustomerPickupMenu({ pickupToken }: { pickupToken: string }) {
  const [menu, setMenu] = useState<MenuPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    pickupNumber: number | null;
    displayNumber: number;
    subtotalAmount: number;
  } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/public/pickup-points/${encodeURIComponent(pickupToken)}/menu`);
    if (!res.ok) {
      setError('Không tìm thấy mã lấy món hoặc menu.');
      return;
    }
    setMenu((await res.json()) as MenuPayload);
  }, [pickupToken]);

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
        { menuItemId: item.id, name: item.name, priceAmount: item.priceAmount, quantity: 1 },
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
      const res = await fetch(
        `/api/public/pickup-points/${encodeURIComponent(pickupToken)}/orders`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idempotencyKey,
            lines: cart.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
          }),
        },
      );
      const data = (await res.json()) as {
        error?: string;
        pickupNumber?: number | null;
        displayNumber?: number;
        subtotalAmount?: number;
      };
      if (!res.ok || data.displayNumber === undefined) {
        setError(data.error || 'Gửi order thất bại.');
        return;
      }
      setResult({
        pickupNumber: data.pickupNumber ?? null,
        displayNumber: data.displayNumber,
        subtotalAmount: data.subtotalAmount ?? subtotal,
      });
      setCart([]);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 text-center">
        <p className="text-sm font-semibold text-brand-600">Số lấy món</p>
        <p className="mt-2 text-6xl font-extrabold tabular-nums text-ink-900">
          {result.pickupNumber !== null
            ? String(result.pickupNumber).padStart(2, '0')
            : `#${result.displayNumber}`}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Tổng {formatVnd(result.subtotalAmount)}. Chờ gọi số — không cần ở lại trang này.
        </p>
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
          {menu.pickupPoint?.name ?? 'Lấy món'}
        </h1>
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
                    disabled={item.isSoldOut}
                    onClick={() => addItem(item)}
                    className="flex min-h-14 w-full items-center justify-between rounded-2xl border border-border bg-white px-4 py-3 text-left disabled:opacity-50"
                  >
                    <span>
                      <span className="block font-semibold">{item.name}</span>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {formatVnd(item.priceAmount)}
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
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submitOrder()}
            className="min-h-12 w-full rounded-xl bg-brand-600 text-sm font-bold text-white"
          >
            {submitting ? 'Đang gửi…' : `Gửi · ${formatVnd(subtotal)}`}
          </button>
        </div>
      ) : null}
    </div>
  );
}
