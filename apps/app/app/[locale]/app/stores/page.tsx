import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageMessages } from '@/components/page-messages';
import {
  getOwnerStoreSelection,
  readStoreSlug,
  type StoreSearchParams,
  withStore,
} from '@/lib/active-store';

export const dynamic = 'force-dynamic';

type StoresPageProps = {
  searchParams: Promise<StoreSearchParams>;
};

export async function generateMetadata() {
  const t = await getTranslations('owner');
  return { title: t('manageStores') };
}

function getModeKey(serviceMode: string): 'modeCounter' | 'modeHybrid' | 'modeDineIn' {
  if (serviceMode === 'counter_pickup') return 'modeCounter';
  if (serviceMode === 'hybrid') return 'modeHybrid';
  return 'modeDineIn';
}

export default async function StoresPage({ searchParams }: StoresPageProps) {
  const t = await getTranslations('owner');
  const selection = await getOwnerStoreSelection(readStoreSlug(await searchParams));
  if (!selection) redirect('/login?next=/app/stores');

  return (
    <PageMessages namespaces={['owner']}>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 border-b border-border/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-jade-600">{t('storeManagement')}</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-ink-900">
              {t('manageStores')}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{t('storesSubtitle')}</p>
          </div>
          <Link
            href="/app/onboarding"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-jade-600 px-5 text-sm font-bold text-white hover:bg-jade-700"
          >
            {t('addStore')}
          </Link>
        </header>

        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
          {selection.stores.map((store) => {
            const isCurrent = selection.store?.id === store.id;
            return (
              <li
                key={store.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-extrabold text-ink-900">{store.name}</h2>
                    {isCurrent ? (
                      <span className="rounded-full bg-jade-50 px-2.5 py-1 text-xs font-bold text-jade-600">
                        {t('currentStore')}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(getModeKey(store.serviceMode))} · {t('plan', { plan: store.plan })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {store.acceptingPublicRequests ? t('intakeEnabled') : t('intakePaused')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={withStore('/app', store.slug)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-jade-600 px-4 text-sm font-bold text-white hover:bg-jade-700"
                  >
                    {t('openStore')}
                  </Link>
                  <Link
                    href={withStore('/app/settings', store.slug)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-bold text-ink-900 hover:bg-jade-50"
                  >
                    {t('settings')}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </PageMessages>
  );
}
