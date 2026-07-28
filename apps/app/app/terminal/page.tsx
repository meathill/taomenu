import { listStoresForUser } from '@taomenu/db';
import { APP_NAME } from '@taomenu/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';
import { TerminalBoard } from './terminal-board';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Terminal',
};

export default async function TerminalPage() {
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
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="mb-4">
        <p className="text-sm font-semibold text-jade-600">{APP_NAME}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink-900">Terminal · {store.name}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          MVP dùng phiên chủ quán. Ghép mã thiết bị sẽ ở giai đoạn sau.
        </p>
        <Link href="/app" className="mt-2 inline-block text-sm font-semibold text-jade-600">
          ← Chủ quán
        </Link>
      </header>
      <TerminalBoard storeId={store.id} />
    </div>
  );
}
