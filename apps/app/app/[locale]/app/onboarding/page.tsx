import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr';
import { APP_NAME } from '@taomenu/shared';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageMessages } from '@/components/page-messages';
import {
  getOwnerStoreSelection,
  readStoreSlug,
  type StoreSearchParams,
  withStore,
} from '@/lib/active-store';
import { OnboardingForm } from './onboarding-form';

export const dynamic = 'force-dynamic';

type OnboardingPageProps = {
  searchParams: Promise<StoreSearchParams>;
};

export async function generateMetadata() {
  const t = await getTranslations('onboarding');
  return { title: t('title') };
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const t = await getTranslations('onboarding');
  const selection = await getOwnerStoreSelection(readStoreSlug(await searchParams));
  const returnStore = selection?.store ?? selection?.stores[0] ?? null;

  return (
    <PageMessages namespaces={['onboarding']}>
      <div className="mx-auto max-w-lg px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-jade-600">{APP_NAME}</p>
          {returnStore ? (
            <Link
              href={withStore('/app/stores', returnStore.slug)}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-jade-600 hover:bg-jade-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-jade-600"
            >
              <ArrowLeftIcon className="size-4" weight="bold" />
              {t('backToStores')}
            </Link>
          ) : null}
        </div>
        <h1 className="mt-1 text-2xl font-extrabold text-ink-900">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('subtitle')}</p>
        <div className="mt-8 rounded-2xl border border-border bg-white p-5 shadow-sm">
          <OnboardingForm />
        </div>
      </div>
    </PageMessages>
  );
}
