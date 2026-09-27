import {
  type GmvByCurrency,
  getAdminDailySeries,
  getAdminFunnel,
  getAdminOverview,
  getAdminRange,
  resolveAdminRangeDays,
} from '@taomenu/db';
import { formatCurrency } from '@taomenu/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import { getDb } from '@/lib/db';
import { RangeTabs } from './_components/range-tabs';
import { TrendChart } from './_components/trend-chart';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('admin');
  return { title: t('navOverview') };
}

type DashboardProps = {
  searchParams: Promise<{ range?: string }>;
};

function formatRevenue(items: readonly GmvByCurrency[], locale: string): string {
  if (items.length === 0) {
    return '—';
  }
  return items.map((item) => formatCurrency(item.totalMinor, item.currency, locale)).join(' · ');
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-ink-900">{value}</p>
      {sub ? <p className="mt-1 text-xs tabular-nums text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export default async function AdminDashboardPage({ searchParams }: DashboardProps) {
  const params = await searchParams;
  const t = await getTranslations('admin');
  const locale = await getLocale();

  const days = resolveAdminRangeDays(params.range);
  const range = getAdminRange(days);
  const rangeKey = `${days}d` as '7d' | '30d' | '90d';
  const db = getDb();
  const [overview, series, funnel] = await Promise.all([
    getAdminOverview(db, range),
    getAdminDailySeries(db, range),
    getAdminFunnel(db),
  ]);

  const funnelSteps = [
    { label: t('funnelUsers'), value: funnel.totalUsers },
    { label: t('funnelWithStore'), value: funnel.usersWithStore },
    { label: t('funnelPublished'), value: funnel.storesPublished },
    { label: t('funnelWithOrder'), value: funnel.storesWithOrder },
    { label: t('funnelPro'), value: funnel.proStores },
  ];
  const funnelMax = Math.max(1, funnelSteps[0]?.value ?? 1);

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <RangeTabs
          current={rangeKey}
          base="/admin"
          labels={{ '7d': t('range7d'), '30d': t('range30d'), '90d': t('range90d') }}
        />
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label={t('kpiNewUsers')} value={overview.newUsers.toLocaleString(locale)} />
        <StatCard label={t('kpiNewStores')} value={overview.newStores.toLocaleString(locale)} />
        <StatCard
          label={t('kpiOrders')}
          value={overview.orders.toLocaleString(locale)}
          sub={formatRevenue(overview.gmvByCurrency, locale)}
        />
        <StatCard label={t('kpiActiveUsers')} value={overview.activeUsers.toLocaleString(locale)} />
        <StatCard label={t('kpiPublishes')} value={overview.newPublishes.toLocaleString(locale)} />
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('kpiTotalUsers')} value={overview.totalUsers.toLocaleString(locale)} />
        <StatCard label={t('kpiTotalStores')} value={overview.totalStores.toLocaleString(locale)} />
        <StatCard
          label={t('kpiPublished')}
          value={overview.publishedStores.toLocaleString(locale)}
        />
        <StatCard label={t('kpiPro')} value={overview.proStores.toLocaleString(locale)} />
      </section>

      <section className="rounded-2xl border border-border bg-white p-4">
        <h2 className="mb-3 text-sm font-bold text-ink-900">{t('trendTitle')}</h2>
        <TrendChart
          series={series}
          labels={{
            users: t('seriesUsers'),
            stores: t('seriesStores'),
            orders: t('seriesOrders'),
            active: t('seriesActive'),
          }}
        />
      </section>

      <section className="rounded-2xl border border-border bg-white p-4">
        <h2 className="mb-3 text-sm font-bold text-ink-900">{t('funnelTitle')}</h2>
        <ol className="space-y-2">
          {funnelSteps.map((step) => (
            <li key={step.label} className="flex items-center gap-3">
              <span className="w-32 shrink-0 text-xs text-muted-foreground">{step.label}</span>
              <div className="h-5 min-w-0 flex-1 rounded bg-paper-50">
                <div
                  className="h-5 rounded bg-jade-500/80"
                  style={{ width: `${Math.max(2, Math.round((step.value / funnelMax) * 100))}%` }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-sm font-bold tabular-nums text-ink-900">
                {step.value.toLocaleString(locale)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <p className="text-xs text-muted-foreground">{t('caveat')}</p>
    </div>
  );
}
