import { listStoresForUser } from '@taomenu/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';
import { MenuEditor } from './menu-editor';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Menu',
};

export default async function MenuPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect('/login?next=/app/menu');
  }

  const stores = await listStoresForUser(getDb(), session.user.id);
  if (stores.length === 0) {
    redirect('/app/onboarding');
  }

  const store = stores[0]!;

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <Link href="/app" className="text-sm font-semibold text-jade-600">
            ← {store.name}
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-ink-900">Menu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Nhập tay từng món. Free: 1 ngôn ngữ ({store.baseLocale}).
          </p>
        </div>
      </div>
      <MenuEditor storeId={store.id} />
    </div>
  );
}
