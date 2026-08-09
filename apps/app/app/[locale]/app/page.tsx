import {
  ChartLineUpIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  ClockIcon,
  QrCodeIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react/dist/ssr';
import { getOwnerOverview } from '@taomenu/db';
import { formatVnd } from '@taomenu/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { PageMessages } from '@/components/page-messages';
import {
  getOwnerStoreSelection,
  readStoreSlug,
  type StoreSearchParams,
  withStore,
} from '@/lib/active-store';
import { getDb } from '@/lib/db';
import { StoreControls } from './store-controls';

export const dynamic = 'force-dynamic';

type OwnerHomePageProps = {
  searchParams: Promise<StoreSearchParams>;
};

export async function generateMetadata() {
  const t = await getTranslations('owner');
  return { title: t('title') };
}

export default async function OwnerHomePage({ searchParams }: OwnerHomePageProps) {
  const t = await getTranslations('owner');
  const locale = await getLocale();
  const selection = await getOwnerStoreSelection(readStoreSlug(await searchParams));
  if (!selection) redirect('/login?next=/app');
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
  const isReady = overview.readiness.menu === 'published';
  const status = !isReady ? 'notReady' : store.acceptingPublicRequests ? 'open' : 'paused';
  const statusLabel =
    status === 'open'
      ? t('statusOpen')
      : status === 'paused'
        ? t('statusPaused')
        : t('statusNotReady');
  const orderStatusLabels: Record<string, string> = {
    submitted: t('orderStatus_submitted'),
    accepted: t('orderStatus_accepted'),
    ready_for_pickup: t('orderStatus_ready_for_pickup'),
    served: t('orderStatus_served'),
    picked_up: t('orderStatus_picked_up'),
    cancelled: t('orderStatus_cancelled'),
  };
  const businessDate = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeZone: store.timezone,
  }).format(new Date());
  const recentOrderDateFormatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: store.timezone,
  });
  const checklist = [
    {
      key: 'menu',
      done: overview.readiness.menu !== 'empty',
      label: t('setupMenu'),
      href: withStore('/app/menu', store.slug),
      icon: ClipboardTextIcon,
    },
    {
      key: 'publish',
      done: overview.readiness.menu === 'published',
      label: t('setupPublish'),
      href: withStore('/app/menu', store.slug),
      icon: CheckCircleIcon,
    },
    {
      key: 'qr',
      done: overview.readiness.qrCount > 0,
      label: t('setupQr'),
      href: withStore('/app/tables', store.slug),
      icon: QrCodeIcon,
    },
    {
      key: 'terminal',
      done: overview.readiness.activeTerminalCount > 0,
      label: t('setupTerminal'),
      href: withStore('/app/staff', store.slug),
      icon: ClockIcon,
    },
    {
      key: 'test',
      done: overview.recentOrders.length > 0,
      label: t('setupTest'),
      href: withStore('/app/orders', store.slug),
      icon: CheckCircleIcon,
    },
  ];

  return (
    <PageMessages namespaces={['owner']}>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-jade-600">{t('overview')}</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-ink-900">
              {t('goodMorning', { name: selection.user.name || store.name })}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('overviewSubtitle')}</p>
          </div>
          <div
            className={[
              'inline-flex min-h-11 items-center gap-2 self-start rounded-full px-4 text-sm font-bold',
              status === 'open'
                ? 'bg-jade-50 text-jade-700'
                : status === 'paused'
                  ? 'bg-brand-50 text-brand-700'
                  : 'bg-gold-50 text-ink-900',
            ].join(' ')}
          >
            {status === 'open' ? (
              <CheckCircleIcon className="size-5" weight="fill" />
            ) : (
              <WarningCircleIcon className="size-5" weight="fill" />
            )}
            {statusLabel}
          </div>
        </header>

        <StoreControls
          storeId={store.id}
          acceptingPublicRequests={store.acceptingPublicRequests}
          isReady={isReady}
        />

        <section aria-labelledby="today-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="today-title" className="text-lg font-black text-ink-900">
              {t('today')}
            </h2>
            <span className="text-xs font-semibold text-muted-foreground">
              {businessDate} · {store.timezone}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: t('todayOrders'),
                value: String(overview.stats.todayOrderCount),
                tone: 'bg-white',
              },
              {
                label: t('todayOrderValue'),
                value: formatVnd(overview.stats.todayOrderValue),
                tone: 'bg-white',
              },
              {
                label: t('todayRecordedPayment'),
                value: formatVnd(overview.stats.todayRecordedPayment),
                tone: 'bg-white',
              },
              {
                label: t('pendingWork'),
                value: String(
                  overview.readiness.openOrderCount + overview.readiness.openRequestCount,
                ),
                tone: 'bg-gold-50',
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className={['rounded-2xl border border-border p-4', metric.tone].join(' ')}
              >
                <p className="text-sm font-semibold text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-2xl font-black tabular-nums text-ink-900">{metric.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t('paymentNote')}</p>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <section
            className="rounded-2xl border border-border bg-white p-5"
            aria-labelledby="setup-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="setup-title" className="text-lg font-black text-ink-900">
                  {t('setupTitle')}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('setupSubtitle')}</p>
              </div>
              <span className="rounded-full bg-jade-50 px-3 py-1 text-xs font-bold text-jade-700">
                {checklist.filter((item) => item.done).length}/5
              </span>
            </div>
            <ol className="mt-5 space-y-2">
              {checklist.map(({ key, done, href, icon: Icon, label }, index) => (
                <li key={key}>
                  <Link
                    href={href}
                    className="flex min-h-14 items-center gap-3 rounded-xl border border-border px-3 py-2 hover:bg-paper-50"
                  >
                    <span
                      className={[
                        'grid size-9 shrink-0 place-items-center rounded-full',
                        done ? 'bg-jade-600 text-white' : 'bg-paper-50 text-muted-foreground',
                      ].join(' ')}
                    >
                      {done ? (
                        <CheckCircleIcon className="size-5" weight="fill" />
                      ) : (
                        <Icon className="size-5" weight="duotone" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-bold text-ink-900">
                      {index + 1}. {label}
                    </span>
                    {!done ? (
                      <span className="text-xs font-bold text-jade-600">{t('start')}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <section
            className="rounded-2xl border border-border bg-white p-5"
            aria-labelledby="recent-title"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="recent-title" className="text-lg font-black text-ink-900">
                {t('recentOrders')}
              </h2>
              <Link
                href={withStore('/app/orders', store.slug)}
                className="text-sm font-bold text-jade-600"
              >
                {t('viewAll')}
              </Link>
            </div>
            {overview.recentOrders.length === 0 ? (
              <div className="mt-5 rounded-xl bg-paper-50 p-4 text-sm text-muted-foreground">
                {t('noRecentOrders')}
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {overview.recentOrders.map((order) => (
                  <li key={order.id} className="flex items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-bold text-ink-900">#{order.displayNumber}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {orderStatusLabels[order.status] || order.status} ·{' '}
                        {recentOrderDateFormatter.format(order.createdAt)}
                      </p>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-ink-900">
                      {formatVnd(order.amount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ChartLineUpIcon className="size-4" />
          {t('openSessionCount', { count: overview.stats.openTableSessionCount })}
        </div>
      </div>
    </PageMessages>
  );
}
