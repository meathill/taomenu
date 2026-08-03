import { APP_NAME } from '@taomenu/shared';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

export async function SiteHeader() {
  const t = await getTranslations('shell');

  return (
    <header className="border-b border-border/80 bg-paper-50/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
        <Link href="/app" className="text-base font-bold tracking-tight text-jade-600">
          {APP_NAME}
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1" aria-label="Primary">
          <Link
            href="/app"
            className="rounded-xl px-2.5 py-2 text-sm font-semibold text-ink-900 hover:bg-brand-50"
          >
            {t('appHome')}
          </Link>
          <Link
            href="/terminal"
            className="rounded-xl px-2.5 py-2 text-sm font-semibold text-ink-900 hover:bg-brand-50"
          >
            {t('terminal')}
          </Link>
          <Link
            href="/login"
            className="rounded-xl px-2.5 py-2 text-sm font-semibold text-ink-900 hover:bg-brand-50"
          >
            {t('login')}
          </Link>
        </nav>
      </div>
    </header>
  );
}
