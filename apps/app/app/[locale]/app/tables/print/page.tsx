import { isLocale } from '@taomenu/shared';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageMessages } from '@/components/page-messages';
import { getOwnerStoreSelection, readStoreSlug, type StoreSearchParams } from '@/lib/active-store';
import { PrintSheet } from './print-sheet';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('tables');
  return { title: t('printTitle') };
}

type TablesPrintPageProps = { searchParams: Promise<StoreSearchParams> };

export default async function TablesPrintPage({ searchParams }: TablesPrintPageProps) {
  const selection = await getOwnerStoreSelection(readStoreSlug(await searchParams));
  if (!selection) redirect('/login?next=/app/tables/print');
  if (!selection.store) {
    redirect('/app/onboarding');
  }
  const store = selection.store;

  // 桌贴上的提示语面向顾客，使用门店的顾客语言（baseLocale）而非店主 UI 语言
  const hintT = await getTranslations({
    locale: isLocale(store.baseLocale) ? store.baseLocale : 'en',
    namespace: 'tables',
  });

  return (
    <PageMessages namespaces={['tables']}>
      <PrintSheet
        storeId={store.id}
        storeSlug={store.slug}
        storeName={store.name}
        plan={store.plan}
        scanHint={hintT('scanHint')}
      />
    </PageMessages>
  );
}
