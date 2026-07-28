import { listStoresForUser } from '@taomenu/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';
import { TablesManager } from './tables-manager';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Bàn & QR',
};

export default async function TablesPage() {
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
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Link href="/app" className="text-sm font-semibold text-jade-600">
        ← {store.name}
      </Link>
      <h1 className="mt-1 text-2xl font-extrabold text-ink-900">Bàn & mã QR</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tạo bàn hoặc điểm lấy món. Token chỉ hiện khi tạo/đổi mã.
      </p>
      <div className="mt-6">
        <TablesManager storeId={store.id} storeSlug={store.slug} />
      </div>
    </div>
  );
}
