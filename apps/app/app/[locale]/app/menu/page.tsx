import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageMessages } from '@/components/page-messages';
import {
  getOwnerStoreSelection,
  readStoreSlug,
  type StoreSearchParams,
  withStore,
} from '@/lib/active-store';
import { MenuEditor } from './menu-editor';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('menu');
  return { title: t('title') };
}

type MenuPageProps = { searchParams: Promise<StoreSearchParams> };

export default async function MenuPage({ searchParams }: MenuPageProps) {
  const t = await getTranslations('menu');
  const selection = await getOwnerStoreSelection(readStoreSlug(await searchParams));
  if (!selection) redirect('/login?next=/app/menu');
  if (!selection.store) {
    redirect('/app/onboarding');
  }
  const store = selection.store;

  return (
    <PageMessages namespaces={['menu']}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 border-b border-border/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mt-1 text-2xl font-extrabold text-ink-900">{t('title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('subtitle', { locale: store.baseLocale })}
            </p>
          </div>
          <a
            href={withStore('/app/orders', store.slug)}
            className="text-sm font-bold text-jade-600"
          >
            {t('viewOrders')}
          </a>
        </div>
        <MenuEditor storeId={store.id} />
      </div>
    </PageMessages>
  );
}
