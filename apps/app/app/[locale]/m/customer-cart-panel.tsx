'use client';

import { MinusIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { formatCurrency } from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';
import { type CartLine, ORDER_NOTE_MAX_LENGTH } from './customer-cart';

type CustomerCartPanelProps = {
  cart: CartLine[];
  subtotal: number;
  currency: string;
  note: string;
  isAcceptingOrders: boolean;
  isSubmitting: boolean;
  onNoteChange: (note: string) => void;
  onChangeQuantity: (lineKey: string, delta: number) => void;
  onSubmit: () => void;
};

/** 顾客页底部购物车：可增减 / 删除菜品，可写整单备注（issue #22）。 */
export function CustomerCartPanel({
  cart,
  subtotal,
  currency,
  note,
  isAcceptingOrders,
  isSubmitting,
  onNoteChange,
  onChangeQuantity,
  onSubmit,
}: CustomerCartPanelProps) {
  const t = useTranslations('customer');
  const locale = useLocale();
  const stepButtonClassName =
    'grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-white text-ink-900 active:bg-paper-100';

  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg">
      <div className="mx-auto max-w-lg space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-ink-900">{t('cartReview')}</p>
          <p className="text-sm font-bold tabular-nums text-ink-900">
            {formatCurrency(subtotal, currency, locale)}
          </p>
        </div>
        <ul className="max-h-40 space-y-2 overflow-y-auto">
          {cart.map((line) => (
            <li key={line.lineKey} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 break-words text-ink-900">{line.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {formatCurrency(line.priceAmount * line.quantity, currency, locale)}
              </span>
              <button
                type="button"
                aria-label={line.quantity > 1 ? t('decreaseQuantity') : t('removeItem')}
                onClick={() => onChangeQuantity(line.lineKey, -1)}
                className={stepButtonClassName}
              >
                {line.quantity > 1 ? (
                  <MinusIcon className="size-4" aria-hidden />
                ) : (
                  <TrashIcon className="size-4 text-brand-600" aria-hidden />
                )}
              </button>
              <span className="w-6 shrink-0 text-center font-bold tabular-nums">
                {line.quantity}
              </span>
              <button
                type="button"
                aria-label={t('increaseQuantity')}
                disabled={line.quantity >= 99}
                onClick={() => onChangeQuantity(line.lineKey, 1)}
                className={`${stepButtonClassName} disabled:opacity-40`}
              >
                <PlusIcon className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <label className="block">
          <span className="sr-only">{t('orderNote')}</span>
          <textarea
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            maxLength={ORDER_NOTE_MAX_LENGTH}
            rows={2}
            placeholder={t('orderNotePlaceholder')}
            className="w-full resize-none rounded-xl border border-border bg-paper-50 px-3 py-2 text-base outline-none ring-jade-600 focus:ring-2"
          />
        </label>
        {!isAcceptingOrders ? (
          <p className="text-xs font-semibold text-brand-700" role="status">
            {t('pausedCart')}
          </p>
        ) : null}
        <button
          type="button"
          disabled={isSubmitting || !isAcceptingOrders}
          onClick={onSubmit}
          className="min-h-12 w-full rounded-xl bg-brand-600 px-5 text-sm font-bold text-white disabled:bg-paper-100 disabled:text-muted-foreground"
        >
          {isSubmitting
            ? t('sending')
            : t('sendWithPrice', { price: formatCurrency(subtotal, currency, locale) })}
        </button>
      </div>
    </div>
  );
}
