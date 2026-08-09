import { getOwnerOverview } from '@taomenu/db';
import { formatCurrency } from '@taomenu/shared';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { PageMessages } from '@/components/page-messages';
import { getOwnerStoreSelection, readStoreSlug, type StoreSearchParams } from '@/lib/active-store';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type AnalyticsPageProps = {
  searchParams: Promise<StoreSearchParams>;
};

export async function generateMetadata() {
  const t = await getTranslations('owner');
  return { title: t('analytics') };
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const t = await getTranslations('owner');
  const locale = await getLocale();
  const selection = await getOwnerStoreSelection(readStoreSlug(await searchParams));
  if (!selection) redirect('/login?next=/app/analytics');
  if (!selection.store) redirect('/app/onboarding');
  const store = selection.store;
  const overview = await getOwnerOverview(
    {
      storeId: store.id,
      userId: selection.user.id,
      role: 'owner',
      plan: store.plan,
      staffSeatAddons: store.staffSeatAddons,
    },
    getDb(),
    store.timezone,
  );
  const businessDate = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: store.timezone,
  }).format(new Date());

  return (
    <PageMessages namespaces={['owner']}>
      <div className="space-y-6">
        <header className="border-b border-border/80 pb-5">
          <p className="text-sm font-bold text-jade-600">{store.name}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-ink-900">{t('analytics')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('analyticsSubtitle')}</p>
        </header>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <p className="text-xs font-semibold text-muted-foreground sm:col-span-2 xl:col-span-4">
            {businessDate} · {store.timezone}
          </p>
          <div className="rounded-2xl border border-border bg-white p-5">
            <p className="text-sm font-semibold text-muted-foreground">{t('todayOrders')}</p>
            <p className="mt-2 text-3xl font-black tabular-nums text-ink-900">
              {overview.stats.todayOrderCount}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <p className="text-sm font-semibold text-muted-foreground">{t('todayOrderValue')}</p>
            <p className="mt-2 text-2xl font-black tabular-nums text-ink-900">
              {formatCurrency(overview.stats.todayOrderValue, store.currency, locale)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-5">
            <p className="text-sm font-semibold text-muted-foreground">
              {t('todayRecordedPayment')}
            </p>
            <p className="mt-2 text-2xl font-black tabular-nums text-ink-900">
              {formatCurrency(overview.stats.todayRecordedPayment, store.currency, locale)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-gold-50 p-5">
            <p className="text-sm font-semibold text-muted-foreground">{t('pendingWork')}</p>
            <p className="mt-2 text-3xl font-black tabular-nums text-ink-900">
              {overview.readiness.openOrderCount + overview.readiness.openRequestCount}
            </p>
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="text-lg font-black text-ink-900">{t('analyticsNow')}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t('analyticsNote')}
          </p>
        </section>
      </div>
    </PageMessages>
  );
}
