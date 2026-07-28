import { ForkKnifeIcon, QrCodeIcon, StorefrontIcon } from '@phosphor-icons/react/dist/ssr';
import { listStoresForUser } from '@taomenu/db';
import { APP_NAME } from '@taomenu/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Chủ quán',
};

export default async function OwnerHomePage() {
  const session = await getSession();
  if (!session?.user) {
    redirect('/login?next=/app');
  }

  const stores = await listStoresForUser(getDb(), session.user.id);
  if (stores.length === 0) {
    redirect('/app/onboarding');
  }

  const store = stores[0]!;
  const links = [
    { href: '/app/menu', label: 'Menu', icon: ForkKnifeIcon },
    { href: '/app/tables', label: 'Bàn / QR', icon: QrCodeIcon },
    { href: '/terminal', label: 'Terminal nhân viên', icon: StorefrontIcon },
  ] as const;

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="mb-6">
        <p className="text-sm font-semibold text-jade-600">{APP_NAME}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink-900">{store.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {store.serviceMode === 'counter_pickup'
            ? 'Lấy tại quầy'
            : store.serviceMode === 'hybrid'
              ? 'Bàn + lấy quầy'
              : 'Ăn tại bàn'}{' '}
          · gói {store.plan}
        </p>
      </header>
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
  );
}
