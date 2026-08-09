import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageMessages } from '@/components/page-messages';
import { getOwnerStoreSelection, readStoreSlug, type StoreSearchParams } from '@/lib/active-store';
import { TerminalBoard } from '../../terminal/terminal-board';

export const dynamic = 'force-dynamic';

type OrdersPageProps = {
  searchParams: Promise<StoreSearchParams>;
};

export async function generateMetadata() {
  const t = await getTranslations('owner');
  return { title: t('orders') };
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const t = await getTranslations('owner');
  const selection = await getOwnerStoreSelection(readStoreSlug(await searchParams));
  if (!selection) redirect('/login?next=/app/orders');
  if (!selection.store) redirect('/app/onboarding');

  return (
    <PageMessages namespaces={['terminal']}>
      <div className="space-y-5">
        <header className="border-b border-border/80 pb-5">
          <p className="text-sm font-bold text-jade-600">{selection.store.name}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-ink-900">{t('orders')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('ordersSubtitle')}</p>
        </header>
        <TerminalBoard storeId={selection.store.id} currency={selection.store.currency} />
      </div>
    </PageMessages>
  );
}
