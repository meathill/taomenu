import { getAdminBehavior, getAdminRange, resolveAdminRangeDays } from '@taomenu/db';
import { formatCurrency } from '@taomenu/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import { getDb } from '@/lib/db';
import { RangeTabs } from '../_components/range-tabs';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('admin');
  return { title: t('behaviorTitle') };
}

type BehaviorPageProps = {
  searchParams: Promise<{ range?: string }>;
};

const CELL = 'px-3 py-3 align-top';
const NUM_CELL = 'px-3 py-3 align-top text-right tabular-nums';

function fulfillmentLabel(mode: string, labels: { dineIn: string; pickup: string }): string {
  if (mode === 'dine_in') return labels.dineIn;
  if (mode === 'pickup') return labels.pickup;
  return mode;
}

function requestLabel(type: string, labels: { callStaff: string; requestBill: string }): string {
  if (type === 'call_staff') return labels.callStaff;
  if (type === 'request_bill') return labels.requestBill;
  return type;
}

function paymentLabel(
  method: string,
  labels: { cash: string; bankTransfer: string; other: string },
): string {
  if (method === 'cash') return labels.cash;
  if (method === 'bank_transfer') return labels.bankTransfer;
  return labels.other;
}

export default async function AdminBehaviorPage({ searchParams }: BehaviorPageProps) {
  const params = await searchParams;
  const t = await getTranslations('admin');
  const locale = await getLocale();

  const days = resolveAdminRangeDays(params.range);
  const rangeKey = `${days}d` as '7d' | '30d' | '90d';
  const behavior = await getAdminBehavior(getDb(), getAdminRange(days));
  const isEmpty =
    behavior.orderStatus.length === 0 &&
    behavior.fulfillment.length === 0 &&
    behavior.serviceRequests.length === 0 &&
    behavior.payments.length === 0;

  const modeLabels = { dineIn: t('dineIn'), pickup: t('pickup') };
  const requestLabels = { callStaff: t('callStaff'), requestBill: t('requestBill') };
  const paymentLabels = { cash: t('cash'), bankTransfer: t('bankTransfer'), other: t('other') };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <RangeTabs
          current={rangeKey}
          base="/admin/behavior"
          labels={{ '7d': t('range7d'), '30d': t('range30d'), '90d': t('range90d') }}
        />
      </div>

      {isEmpty ? (
        <p className="rounded-2xl border border-border bg-white p-5 text-sm text-muted-foreground">
          {t('emptyBehavior')}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-ink-900">{t('orderStatusTitle')}</h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full min-w-[320px] text-sm">
            <tbody className="divide-y divide-border">
              {behavior.orderStatus.map((row) => (
                <tr key={row.status}>
                  <td className={`${CELL} font-mono text-xs text-ink-900`}>{row.status}</td>
                  <td className={NUM_CELL}>{row.count.toLocaleString(locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-ink-900">{t('fulfillmentTitle')}</h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-paper-50 text-xs font-bold text-muted-foreground">
              <tr>
                <th className={`${CELL} text-left`}>{t('fulfillmentTitle')}</th>
                <th className={NUM_CELL}>{t('colOrders')}</th>
                <th className={NUM_CELL}>{t('colGmv')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {behavior.fulfillment.map((row) => (
                <tr key={`${row.mode}-${row.currency}`}>
                  <td className={`${CELL} text-left`}>{fulfillmentLabel(row.mode, modeLabels)}</td>
                  <td className={NUM_CELL}>{row.count.toLocaleString(locale)}</td>
                  <td className={NUM_CELL}>
                    {formatCurrency(row.totalMinor, row.currency, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-ink-900">{t('requestsTitle')}</h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full min-w-[480px] text-sm">
            <tbody className="divide-y divide-border">
              {behavior.serviceRequests.map((row) => (
                <tr key={row.type}>
                  <td className={`${CELL} text-left`}>{requestLabel(row.type, requestLabels)}</td>
                  <td className={`${CELL} text-right text-xs text-muted-foreground`}>
                    {t('resolvedCount', { resolved: row.resolved, count: row.count })}
                  </td>
                  <td className={NUM_CELL}>{row.count.toLocaleString(locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-ink-900">{t('paymentsTitle')}</h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="bg-paper-50 text-xs font-bold text-muted-foreground">
              <tr>
                <th className={`${CELL} text-left`}>{t('paymentsTitle')}</th>
                <th className={NUM_CELL}>{t('colOrders')}</th>
                <th className={NUM_CELL}>{t('colGmv')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {behavior.payments.map((row) => (
                <tr key={`${row.method}-${row.currency}`}>
                  <td className={`${CELL} text-left`}>{paymentLabel(row.method, paymentLabels)}</td>
                  <td className={NUM_CELL}>{row.count.toLocaleString(locale)}</td>
                  <td className={NUM_CELL}>
                    {formatCurrency(row.totalMinor, row.currency, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
