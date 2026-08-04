import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageMessages } from '@/components/page-messages';
import { getOwnerStoreSelection, readStoreSlug, type StoreSearchParams } from '@/lib/active-store';
import { StoreSettingsForm } from './store-settings-form';

export const dynamic = 'force-dynamic';

type SettingsPageProps = {
  searchParams: Promise<StoreSearchParams>;
};

export async function generateMetadata() {
  const t = await getTranslations('owner');
  return { title: t('settings') };
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const t = await getTranslations('owner');
  const selection = await getOwnerStoreSelection(readStoreSlug(await searchParams));
  if (!selection) redirect('/login?next=/app/settings');
  if (!selection.store) redirect('/app/onboarding');

  return (
    <PageMessages namespaces={['owner']}>
      <div className="space-y-6">
        <header className="border-b border-border/80 pb-5">
          <p className="text-sm font-bold text-jade-600">{selection.store.name}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-ink-900">{t('settings')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('settingsSubtitle')}</p>
        </header>
        <StoreSettingsForm store={selection.store} />
      </div>
    </PageMessages>
  );
}
