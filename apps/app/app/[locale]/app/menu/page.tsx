import { getUserPreferences } from '@taomenu/db';
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
import { MenuEditor } from './menu-editor';
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
  const params = await searchParams;
  const selection = await getOwnerStoreSelection(readStoreSlug(params));
  if (!selection) redirect('/login?next=/app/menu');
  if (!selection.store) {
    redirect('/app/onboarding');
  }
  const store = selection.store;
  const requestedMenuLocale = Array.isArray(params.menuLocale)
    ? params.menuLocale[0]
    : params.menuLocale;
  const supportedLocales = new Set(['en', 'vi', 'zh', 'ja']);
  const activeMenuLocale =
    store.plan === 'pro' && requestedMenuLocale && supportedLocales.has(requestedMenuLocale)
      ? requestedMenuLocale
      : store.baseLocale;
  const preferences = await getUserPreferences(getDb(), selection.user.id);
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
        <MenuEditor
          storeId={store.id}
          currency={store.currency}
          activeMenuLocale={activeMenuLocale}
          isPro={store.plan === 'pro'}
          initialHideProTools={preferences.hideMenuProTools}
          upgradeHref={withStore('/app/settings', store.slug)}
        />
      </div>
    </PageMessages>
  );
}
