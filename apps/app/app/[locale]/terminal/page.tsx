import { getStore } from '@taomenu/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageMessages } from '@/components/page-messages';
import {
  getOwnerStoreSelection,
  readStoreSlug,
  type StoreSearchParams,
  withStore,
} from '@/lib/active-store';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';
import { getTerminalSession } from '@/lib/terminal-session';
import { NotificationSetup } from './notification-setup';
import { TerminalBoard } from './terminal-board';

export const dynamic = 'force-dynamic';

type TerminalPageProps = {
  searchParams: Promise<StoreSearchParams>;
};

export async function generateMetadata() {
  const t = await getTranslations('terminal');
  return { title: t('title', { name: '' }) };
}

export default async function TerminalPage({ searchParams }: TerminalPageProps) {
  const t = await getTranslations('terminal');
  const session = await getSession();
  let store: Awaited<ReturnType<typeof getStore>> = null;
  let isPairedDevice = false;
  let deviceName: string | null = null;

  if (!session?.user) {
    redirect('/login?next=/terminal');
  }

  const requestedStoreSlug = readStoreSlug(await searchParams);
  const [selection, terminal] = await Promise.all([
    getOwnerStoreSelection(requestedStoreSlug),
    getTerminalSession(session.user.id),
  ]);

  if (terminal && !requestedStoreSlug) {
    store = await getStore(terminal.storeCtx, getDb());
    isPairedDevice = true;
    deviceName = terminal.device.name;
  } else if (selection?.store) {
    store = selection.store;
  } else {
    redirect('/terminal/pair');
  }

  if (!store) redirect('/terminal/pair');

  return (
    <PageMessages namespaces={['terminal']}>
      <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-col gap-3 border-b border-border/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-jade-600">
              {isPairedDevice ? t('pairedDevice') : t('ownerWorkspace')}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-ink-900">
              {t('title', { name: store.name })}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isPairedDevice
                ? t('pairedAs', { name: deviceName || t('thisDevice') })
                : t('subtitle')}
            </p>
          </div>
          {!isPairedDevice ? (
            <Link href={withStore('/app', store.slug)} className="text-sm font-bold text-jade-600">
              {t('backOwner')}
            </Link>
          ) : null}
        </header>

        <TerminalBoard storeId={store.id} currency={store.currency} />

        <details className="mt-6 rounded-2xl border border-border bg-white p-4">
          <summary className="cursor-pointer list-none text-sm font-bold text-ink-900">
            {t('devicePreparation')}
          </summary>
          <div className="mt-4">
            <NotificationSetup storeId={store.id} />
          </div>
        </details>
      </div>
    </PageMessages>
  );
}
