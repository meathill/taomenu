import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { PageMessages } from '@/components/page-messages';
import {
  getOwnerStoreSelection,
  readStoreSlug,
  type StoreSearchParams,
  withStore,
} from '@/lib/active-store';
import { MenuEditor } from './menu-editor';
import { MenuImportPanel } from './menu-import-panel';
import { getMenuSubtitleKey } from './menu-page-copy';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('menu');
  return { title: t('title') };
}

type MenuPageProps = { searchParams: Promise<StoreSearchParams> };

export default async function MenuPage({ searchParams }: MenuPageProps) {
  const t = await getTranslations('menu');
  const locale = await getLocale();
  const selection = await getOwnerStoreSelection(readStoreSlug(await searchParams));
  if (!selection) redirect('/login?next=/app/menu');
  if (!selection.store) {
    redirect('/app/onboarding');
  }
  const store = selection.store;
  const baseLanguageName =
    new Intl.DisplayNames([locale], { type: 'language' }).of(store.baseLocale) ?? store.baseLocale;

  return (
    <PageMessages namespaces={['menu']}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 border-b border-border/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="mt-1 text-2xl font-extrabold text-ink-900">{t('title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(getMenuSubtitleKey(store.plan), { locale: baseLanguageName })}
            </p>
          </div>
          <a
            href={withStore('/app/orders', store.slug)}
            className="text-sm font-bold text-jade-600"
          >
            {t('viewOrders')}
          </a>
        </div>
        <MenuImportPanel
          storeId={store.id}
          baseLocale={store.baseLocale}
          canUseAi={store.plan === 'pro'}
        />
        <section className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-black text-ink-900">{t('moreProToolsTitle')}</h2>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('moreProToolsHint')}</p>
          </div>
          <ul className="flex flex-wrap gap-1.5 text-xs font-semibold text-indigo-700">
            <li className="rounded-full bg-paper-50 px-2.5 py-1">
              {t('aiTranslate')} · {t('comingSoon')}
            </li>
            <li className="rounded-full bg-indigo-100 px-2.5 py-1">{t('voiceEntry')} · Pro</li>
            <li className="rounded-full bg-paper-50 px-2.5 py-1">
              {t('photoEnhance')} · {t('comingSoon')}
            </li>
          </ul>
        </section>
        <MenuEditor storeId={store.id} canUseVoiceAssistant={store.plan === 'pro'} />
      </div>
    </PageMessages>
  );
}
