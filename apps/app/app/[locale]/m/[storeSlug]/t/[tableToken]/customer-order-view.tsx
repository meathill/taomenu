'use client';

import { formatCurrency } from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';

export type OrderStatusView = {
  displayNumber: number;
  publicToken: string;
  subtotalAmount: number;
  status: string;
  items: Array<{ name: string; quantity: number; lineTotalAmount: number }>;
};

type CustomerOrderViewProps = {
  order: OrderStatusView;
  storeName: string;
  currency: string;
  svcBusy: boolean;
  svcMsg: string | null;
  onRefresh: () => void;
  onOrderMore: () => void;
  onSendService: (type: 'call_staff' | 'request_bill') => void;
};

export function CustomerOrderView({
  order,
  storeName,
  currency,
  svcBusy,
  svcMsg,
  onRefresh,
  onOrderMore,
  onSendService,
}: CustomerOrderViewProps) {
  const t = useTranslations('customer');
  const locale = useLocale();

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <p className="text-sm font-semibold text-brand-600">{storeName}</p>
      <h1 className="mt-2 text-3xl font-extrabold tabular-nums text-ink-900">
        #{order.displayNumber}
      </h1>
      <p className="mt-2 text-base font-bold text-ink-900">
        {(() => {
          const key = ORDER_STATUS_KEYS[order.status];
          return key ? t(key) : order.status;
        })()}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('submittedHint', { total: formatCurrency(order.subtotalAmount, currency, locale) })}
      </p>
      <ul className="mt-4 space-y-1 text-sm">
        {order.items.map((item) => (
          <li key={`${item.name}-${item.quantity}`}>
            {item.quantity}× {item.name}
          </li>
        ))}
      </ul>
      <div className="mt-6 grid gap-2">
        <button
          type="button"
          className="min-h-12 rounded-xl border border-border text-sm font-bold"
          onClick={onRefresh}
        >
          {t('refreshStatus')}
        </button>
        <button
          type="button"
          className="min-h-12 rounded-xl bg-brand-600 text-sm font-bold text-white"
          onClick={onOrderMore}
        >
          {t('orderMore')}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={svcBusy}
            onClick={() => onSendService('call_staff')}
            className="min-h-12 rounded-xl border border-jade-600 text-sm font-bold text-jade-600"
          >
            {t('callStaffShort')}
          </button>
          <button
            type="button"
            disabled={svcBusy}
            onClick={() => onSendService('request_bill')}
            className="min-h-12 rounded-xl border border-jade-600 text-sm font-bold text-jade-600"
          >
            {t('requestBill')}
          </button>
        </div>
        {svcMsg ? <p className="text-center text-xs font-medium text-jade-600">{svcMsg}</p> : null}
      </div>
    </div>
  );
}

const ORDER_STATUS_KEYS: Record<string, string> = {
  submitted: 'statusSubmitted',
  accepted: 'statusAccepted',
  served: 'statusServed',
  cancelled: 'statusCancelled',
};
