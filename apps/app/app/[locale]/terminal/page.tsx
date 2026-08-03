import { listStoresForUser } from '@taomenu/db';
import { APP_NAME } from '@taomenu/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageMessages } from '@/components/page-messages';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';
import { NotificationSetup } from './notification-setup';
import { TerminalBoard } from './terminal-board';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('shell');
  return { title: t('terminal') };
}

export default async function TerminalPage() {
  const t = await getTranslations('terminal');
  const session = await getSession();
  if (!session?.user) {
    redirect('/login?next=/terminal');
  }

  const stores = await listStoresForUser(getDb(), session.user.id);
  if (stores.length === 0) {
    redirect('/app/onboarding');
  }
  const store = stores[0]!;

  return (
    <PageMessages namespaces={['terminal']}>
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <header className="mb-4">
          <p className="text-sm font-semibold text-jade-600">{APP_NAME}</p>
          <h1 className="mt-1 text-2xl font-extrabold text-ink-900">
            {t('title', { name: store.name })}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">{t('subtitle')}</p>
          <Link href="/app" className="mt-2 inline-block text-sm font-semibold text-jade-600">
            {t('backOwner')}
          </Link>
        </header>
        <div className="mb-4">
          <NotificationSetup storeId={store.id} />
        </div>
        <TerminalBoard storeId={store.id} />
      </div>
    </PageMessages>
  );
}
