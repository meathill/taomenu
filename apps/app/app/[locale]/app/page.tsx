import { ForkKnifeIcon, QrCodeIcon, StorefrontIcon } from '@phosphor-icons/react/dist/ssr';
import { listStoresForUser } from '@taomenu/db';
import { APP_NAME } from '@taomenu/shared';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageMessages } from '@/components/page-messages';
import { Link } from '@/i18n/routing';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';
import { StoreControls } from './store-controls';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('owner');
  return { title: t('title') };
}

export default async function OwnerHomePage() {
  const t = await getTranslations('owner');
  const session = await getSession();
  if (!session?.user) {
    redirect('/login?next=/app');
  }

  const userId = session.user.id;
  const stores = await listStoresForUser(getDb(), userId);
  if (stores.length === 0) {
    redirect('/app/onboarding');
  }

  const store = stores[0]!;
  const modeLabel =
    store.serviceMode === 'counter_pickup'
      ? t('modeCounter')
      : store.serviceMode === 'hybrid'
        ? t('modeHybrid')
        : t('modeDineIn');

  const links = [
    { href: '/app/menu' as const, label: t('menu'), icon: ForkKnifeIcon },
    { href: '/app/tables' as const, label: t('tables'), icon: QrCodeIcon },
    { href: '/terminal' as const, label: t('terminal'), icon: StorefrontIcon },
  ];

  return (
    <PageMessages namespaces={['owner']}>
      <div className="mx-auto max-w-lg px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <header className="mb-6">
          <p className="text-sm font-semibold text-jade-600">{APP_NAME}</p>
          <h1 className="mt-1 text-2xl font-extrabold text-ink-900">{store.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {modeLabel} · {t('plan', { plan: store.plan })}
          </p>
        </header>
        <StoreControls storeId={store.id} acceptingPublicRequests={store.acceptingPublicRequests} />
        <ul className="space-y-3">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 font-semibold text-ink-900 shadow-sm"
              >
                <Icon className="size-6 text-jade-600" weight="duotone" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PageMessages>
  );
}
