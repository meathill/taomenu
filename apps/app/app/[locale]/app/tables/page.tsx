import { listStoresForUser } from '@taomenu/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageMessages } from '@/components/page-messages';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';
import { TablesManager } from './tables-manager';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('tables');
  return { title: t('title') };
}

export default async function TablesPage() {
  const t = await getTranslations('tables');
  const session = await getSession();
  if (!session?.user) {
    redirect('/login?next=/app/tables');
  }

  const stores = await listStoresForUser(getDb(), session.user.id);
  if (stores.length === 0) {
    redirect('/app/onboarding');
  }
  const store = stores[0]!;

  return (
    <PageMessages namespaces={['tables']}>
      <div className="mx-auto min-h-dvh max-w-lg px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Link href="/app" className="text-sm font-semibold text-jade-600">
          ← {store.name}
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold text-ink-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
        <div className="mt-6">
          <TablesManager storeId={store.id} storeSlug={store.slug} />
        </div>
      </div>
    </PageMessages>
  );
}
