import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageMessages } from '@/components/page-messages';
import { getOwnerStoreSelection, readStoreSlug, type StoreSearchParams } from '@/lib/active-store';
import { TablesManager } from './tables-manager';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('tables');
  return { title: t('title') };
}

type TablesPageProps = { searchParams: Promise<StoreSearchParams> };

export default async function TablesPage({ searchParams }: TablesPageProps) {
  const t = await getTranslations('tables');
  const selection = await getOwnerStoreSelection(readStoreSlug(await searchParams));
  if (!selection) redirect('/login?next=/app/tables');
  if (!selection.store) {
    redirect('/app/onboarding');
  }
  const store = selection.store;

  return (
    <PageMessages namespaces={['tables']}>
      <div className="space-y-6">
        <div className="border-b border-border/80 pb-5">
          <h1 className="mt-1 text-2xl font-extrabold text-ink-900">{t('title')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div>
          <TablesManager storeId={store.id} storeSlug={store.slug} />
        </div>
      </div>
    </PageMessages>
  );
}
