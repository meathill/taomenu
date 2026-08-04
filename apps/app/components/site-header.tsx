'use client';

import { APP_NAME } from '@taomenu/shared';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export function SiteHeader() {
  const pathname = usePathname();
  const t = useTranslations('shell');
  const isWorkspace = pathname.includes('/app') || pathname.includes('/terminal');

  return (
    <header className="border-b border-border/80 bg-paper-50/90 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3">
        <Link href="/app" className="text-base font-bold tracking-tight text-jade-600">
          {APP_NAME}
        </Link>
        {!isWorkspace ? (
          <nav aria-label="Primary">
            <Link
              href="/login"
              className="rounded-xl px-2.5 py-2 text-sm font-semibold text-ink-900 hover:bg-brand-50"
            >
              {t('login')}
            </Link>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
