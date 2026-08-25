'use client';

import { formatCurrency } from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  nextAction,
  ORDER_STATUS_KEYS,
  type OrderCard,
  REQUEST_STATUS_KEYS,
  type ServiceCard,
  type SessionCard,
} from './terminal-board-helpers';

type RequestSectionProps = {
  requests: ServiceCard[];
  busyId: string | null;
  onTransitionService: (id: string, status: string) => void;
};

export function TerminalRequestSection({
  requests,
  busyId,
  onTransitionService,
}: RequestSectionProps) {
  const t = useTranslations('terminal');
  if (requests.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold text-ink-900">{t('requests')}</h2>
      <ul className="space-y-2">
        {requests.map((req) => (
          <li key={req.id} className="rounded-2xl border border-gold-600 bg-white p-4 shadow-sm">
            <p className="font-bold text-ink-900">
              {t('tableLabel', { name: req.tableName })} ·{' '}
              {req.type === 'request_bill' ? t('requestBill') : t('callStaff')}
            </p>
            <p className="text-xs text-muted-foreground">
              {(() => {
                const key = REQUEST_STATUS_KEYS[req.status];
                return key ? t(key) : req.status;
              })()}
            </p>
            <div className="mt-3 flex gap-2">
              {req.status === 'open' ? (
                <Button
                  type="button"
                  pending={busyId === `${req.id}-acknowledged`}
                  busy={busyId !== null}
                  onClick={() => onTransitionService(req.id, 'acknowledged')}
                  className="min-h-11 flex-1 rounded-xl bg-jade-600 text-xs font-bold text-white"
                >
                  {t('ack')}
                </Button>
              ) : null}
              <Button
                type="button"
                pending={busyId === `${req.id}-resolved`}
                busy={busyId !== null}
                onClick={() => onTransitionService(req.id, 'resolved')}
                className="min-h-11 flex-1 rounded-xl border border-border text-xs font-bold"
              >
                {t('done')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

type OrderSectionProps = {
  orders: OrderCard[];
  currency: string;
  isLoading: boolean;
  busyId: string | null;
  onTransition: (id: string, status: string) => void;
  onPay: (id: string, amount: number) => void;
  onRefresh: () => void;
};

export function TerminalOrderSection({
  orders,
  currency,
  isLoading,
  busyId,
  onTransition,
  onPay,
  onRefresh,
}: OrderSectionProps) {
  const t = useTranslations('terminal');
  const locale = useLocale();
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t('openOrders', { count: orders.length })}</p>
        <Button
          type="button"
          pending={busyId === 'refresh'}
          busy={busyId !== null}
          onClick={onRefresh}
          className="min-h-10 rounded-lg px-2 text-sm font-semibold text-jade-600"
        >
          {t('refresh')}
        </Button>
      </div>
      {isLoading ? (
        <div className="space-y-3" role="status" aria-label={t('loading')} aria-busy="true">
          <div className="space-y-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
          <p className="text-4xl font-extrabold tabular-nums text-gold-600">0</p>
          <p className="mt-2 text-sm font-semibold text-ink-900">{t('noOrdersTitle')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const action = nextAction(order);
            return (
              <li
                key={order.id}
                className="rounded-2xl border border-border bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-2xl font-extrabold tabular-nums text-ink-900">
                      {order.pickupNumber !== null
                        ? `#${String(order.pickupNumber).padStart(2, '0')}`
                        : `#${order.displayNumber}`}
                    </p>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {order.fulfillmentMode === 'pickup' ? t('pickup') : t('dineIn')} · {(() => {
                        const key = ORDER_STATUS_KEYS[order.status];
                        return key ? t(key) : order.status;
                      })()}
                    </p>
                  </div>
                  <p className="text-sm font-bold tabular-nums">
                    {formatCurrency(order.subtotalAmount, currency, locale)}
                  </p>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-ink-900">
                  {order.items.map((item) => (
                    <li key={`${order.id}-${item.name}`}>
                      <span className="font-semibold tabular-nums">{item.quantity}×</span>{' '}
                      {item.name}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 grid gap-2">
                  {action ? (
                    <Button
                      type="button"
                      pending={busyId === order.id}
                      onClick={() => onTransition(order.id, action.status)}
                      className="min-h-12 w-full rounded-xl bg-jade-600 text-sm font-bold text-white"
                    >
                      {t(action.labelKey)}
                    </Button>
                  ) : null}
                  {order.remainingAmount > 0 &&
                  (order.status === 'served' ||
                    order.status === 'picked_up' ||
                    order.status === 'ready_for_pickup' ||
                    order.status === 'accepted') ? (
                    <Button
                      type="button"
                      pending={busyId === `pay-${order.id}`}
                      busy={busyId !== null}
                      onClick={() => onPay(order.id, order.remainingAmount)}
                      className="min-h-11 w-full rounded-xl border border-border text-xs font-bold"
                    >
                      {t('recordCashAmount', {
                        amount: formatCurrency(order.remainingAmount, currency, locale),
                      })}
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

type SessionSectionProps = {
  sessions: SessionCard[];
  currency: string;
  busyId: string | null;
  onClose: (sessionId: string) => void;
};

export function TerminalSessionSection({
  sessions,
  currency,
  busyId,
  onClose,
}: SessionSectionProps) {
  const t = useTranslations('terminal');
  const locale = useLocale();
  if (sessions.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold text-ink-900">{t('closeSection')}</h2>
      <ul className="space-y-2">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="flex flex-col gap-3 rounded-xl border border-border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-bold text-ink-900">
                {t('tableSessionLabel', { name: session.tableName })}
              </p>
              {session.balance ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('sessionBalance', {
                    ordered: formatCurrency(session.balance.ordered, currency, locale),
                    paid: formatCurrency(session.balance.paid, currency, locale),
                    balance: formatCurrency(session.balance.balance, currency, locale),
                  })}
                </p>
              ) : null}
            </div>
            {session.balance && session.balance.balance <= 0 ? (
              <Button
                type="button"
                pending={busyId === `close-${session.id}`}
                busy={busyId !== null}
                onClick={() => onClose(session.id)}
                className="min-h-10 rounded-xl bg-jade-600 px-3 text-xs font-bold text-white"
              >
                {t('closeTable')}
              </Button>
            ) : session.balance ? (
              <span className="text-xs font-bold text-brand-700">
                {t('balanceDue', {
                  amount: formatCurrency(session.balance.balance, currency, locale),
                })}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
