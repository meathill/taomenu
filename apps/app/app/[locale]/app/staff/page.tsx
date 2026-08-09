import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageMessages } from '@/components/page-messages';
import { getOwnerStoreSelection, readStoreSlug, type StoreSearchParams } from '@/lib/active-store';
import { StaffManager } from './staff-manager';

export const dynamic = 'force-dynamic';

type StaffPageProps = {
  searchParams: Promise<StoreSearchParams>;
};

export async function generateMetadata() {
  const t = await getTranslations('owner');
  return { title: t('staff') };
}

export default async function StaffPage({ searchParams }: StaffPageProps) {
  const t = await getTranslations('owner');
  const selection = await getOwnerStoreSelection(readStoreSlug(await searchParams));
  if (!selection) redirect('/login?next=/app/staff');
  if (!selection.store) redirect('/app/onboarding');

  return (
    <PageMessages namespaces={['owner']}>
      <div className="space-y-6">
        <header className="border-b border-border/80 pb-5">
          <p className="text-sm font-bold text-jade-600">{selection.store.name}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-ink-900">{t('staff')}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {selection.store.plan === 'free' ? t('freeTerminalLimit') : t('proTerminalLimit')}
          </p>
        </header>
        <StaffManager
          storeId={selection.store.id}
          plan={selection.store.plan}
          staffSeatAddons={selection.store.staffSeatAddons}
          timeZone={selection.store.timezone}
          currency={selection.store.currency}
        />
      </div>
    </PageMessages>
  );
}
