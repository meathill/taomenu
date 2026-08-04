'use client';

import { APP_NAME } from '@taomenu/shared';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from '@/components/locale-switcher';

export function SiteFooter() {
  const pathname = usePathname();
  const t = useTranslations('shell');

  if (pathname.includes('/app') || pathname.includes('/terminal')) {
    return null;
  }

  return (
    <footer className="mt-auto border-t border-border bg-white">
      <div className="container mx-auto flex flex-col gap-4 px-4 py-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-ink-900">{APP_NAME}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('tagline')}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t('rights')}</p>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold tracking-wide text-ink-900 uppercase">
            {t('language')}
          </p>
          <LocaleSwitcher label={t('language')} />
        </div>
      </div>
    </footer>
  );
}
