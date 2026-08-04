'use client';

import {
  ChartLineUpIcon,
  GearSixIcon,
  ListBulletsIcon,
  ListChecksIcon,
  QrCodeIcon,
  StorefrontIcon,
  UsersThreeIcon,
  XIcon,
} from '@phosphor-icons/react';
import type { StoreRow } from '@taomenu/db';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type ComponentType, type ReactNode, useState } from 'react';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { resolveActiveStore, withStore } from '@/lib/active-store-utils';
import { signOut } from '@/lib/auth-client';
import { StoreSwitcher } from './store-switcher';

type OwnerShellProps = {
  stores: StoreRow[];
  user: {
    name: string | null;
    email: string;
  };
  children: ReactNode;
};

type NavigationItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; weight?: 'bold' | 'duotone' | 'fill' }>;
};

function OwnerNavigation({
  stores,
  activeStore,
  pathname,
  onStoreChange,
  onNavigate,
}: {
  stores: StoreRow[];
  activeStore: StoreRow;
  pathname: string;
  onStoreChange: (storeSlug: string) => void;
  onNavigate?: () => void;
}) {
  const t = useTranslations('owner');
  const items: NavigationItem[] = [
    { href: '/app', label: t('overview'), icon: StorefrontIcon },
    { href: '/app/orders', label: t('orders'), icon: ListChecksIcon },
    { href: '/app/menu', label: t('menu'), icon: ListBulletsIcon },
    { href: '/app/tables', label: t('tables'), icon: QrCodeIcon },
    { href: '/app/staff', label: t('staff'), icon: UsersThreeIcon },
    { href: '/app/analytics', label: t('analytics'), icon: ChartLineUpIcon },
  ];

  return (
    <>
      <div className="border-b border-border/80 px-5 pb-5">
        <Link
          href={withStore('/app', activeStore.slug)}
          className="text-lg font-black tracking-tight text-jade-600"
        >
          TaoMenu
        </Link>
        <StoreSwitcher
          stores={stores}
          activeStore={activeStore}
          onStoreChange={onStoreChange}
          onNavigate={onNavigate}
        />
      </div>

      <nav className="flex-1 px-3 py-4" aria-label={t('navigation')}>
        <p className="px-3 pb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {t('storeManagement')}
        </p>
        <ul className="space-y-1">
          {items.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/app' ? pathname === '/app' : pathname.startsWith(href);
            const className = [
              'flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors',
              isActive ? 'bg-jade-600 text-white shadow-sm' : 'text-ink-900 hover:bg-jade-50',
            ].join(' ');
            return (
              <li key={href}>
                <Link
                  href={withStore(href, activeStore.slug)}
                  onClick={onNavigate}
                  aria-current={isActive ? 'page' : undefined}
                  className={className}
                >
                  <Icon className="size-5 shrink-0" weight={isActive ? 'fill' : 'duotone'} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
        <Link
          href={withStore('/app/settings', activeStore.slug)}
          onClick={onNavigate}
          className={[
            'mt-4 flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold',
            pathname.startsWith('/app/settings')
              ? 'bg-jade-50 text-jade-600'
              : 'text-ink-900 hover:bg-jade-50',
          ].join(' ')}
        >
          <GearSixIcon className="size-5 shrink-0" weight="duotone" />
          {t('settings')}
        </Link>
      </nav>
    </>
  );
}

function OwnerSidebarFooter({
  activeStore,
  user,
}: {
  activeStore: StoreRow;
  user: OwnerShellProps['user'];
}) {
  const t = useTranslations('owner');
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    await signOut();
    window.location.assign('/login');
  }

  return (
    <div className="space-y-3 border-t border-border/80 px-5 py-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <span
          className={[
            'size-2 rounded-full',
            activeStore.acceptingPublicRequests ? 'bg-jade-600' : 'bg-brand-600',
          ].join(' ')}
        />
        {activeStore.acceptingPublicRequests ? t('intakeEnabled') : t('intakePaused')}
      </div>
      <div className="flex items-center justify-between gap-3">
        <LocaleSwitcher label={t('language')} />
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleSignOut()}
          className="min-h-10 rounded-xl px-2 text-xs font-bold text-muted-foreground hover:bg-brand-50 hover:text-ink-900 disabled:opacity-60"
        >
          {t('signOut')}
        </button>
      </div>
      <p className="truncate text-xs text-muted-foreground" title={user.email}>
        {user.name || user.email}
      </p>
    </div>
  );
}

export function OwnerShell({ stores, user, children }: OwnerShellProps) {
  const t = useTranslations('owner');
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeStore = resolveActiveStore(stores, searchParams.get('store'))!;

  function handleStoreChange(storeSlug: string) {
    router.push(withStore(pathname, storeSlug));
    setDrawerOpen(false);
  }

  return (
    <div className="min-h-dvh bg-paper-50">
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border/80 bg-white lg:flex print:hidden">
          <OwnerNavigation
            stores={stores}
            activeStore={activeStore}
            pathname={pathname}
            onStoreChange={handleStoreChange}
          />
          <OwnerSidebarFooter activeStore={activeStore} user={user} />
        </aside>

        {drawerOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label={t('closeMenu')}
              className="absolute inset-0 bg-ink-900/30"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="relative flex h-full w-[min(86vw,20rem)] flex-col bg-white shadow-xl">
              <div className="flex items-center justify-between px-5 pt-4">
                <span className="text-sm font-bold text-muted-foreground">
                  {t('storeManagement')}
                </span>
                <button
                  type="button"
                  aria-label={t('closeMenu')}
                  onClick={() => setDrawerOpen(false)}
                  className="grid size-11 place-items-center rounded-xl text-ink-900 hover:bg-jade-50"
                >
                  <XIcon className="size-5" />
                </button>
              </div>
              <div className="mt-3 flex-1 overflow-y-auto">
                <OwnerNavigation
                  stores={stores}
                  activeStore={activeStore}
                  pathname={pathname}
                  onStoreChange={handleStoreChange}
                  onNavigate={() => setDrawerOpen(false)}
                />
              </div>
              <OwnerSidebarFooter activeStore={activeStore} user={user} />
            </aside>
          </div>
        ) : null}

        <main className="min-w-0 flex-1">
          <div className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border/80 bg-paper-50/95 px-4 backdrop-blur-sm lg:hidden print:hidden">
            <button
              type="button"
              aria-label={t('openMenu')}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
              className="grid size-11 place-items-center rounded-xl border border-border bg-white text-ink-900"
            >
              <ListBulletsIcon className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label={t('switchStore')}
              className="min-w-0 px-3 text-center"
            >
              <span className="block truncate text-sm font-extrabold text-ink-900">
                {activeStore.name}
              </span>
              <span className="block text-xs text-muted-foreground">{t('store')}</span>
            </button>
            <Link
              href={withStore('/app/settings', activeStore.slug)}
              aria-label={t('settings')}
              className="grid size-11 place-items-center rounded-xl border border-border bg-white text-ink-900"
            >
              <GearSixIcon className="size-5" />
            </Link>
          </div>
          <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-8 print:p-0">
            <div className="mx-auto max-w-6xl print:max-w-none">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
