import { APP_NAME } from '@taomenu/shared';
import { getTranslations } from 'next-intl/server';
import { LocaleSwitcher } from '@/components/locale-switcher';

export async function SiteFooter() {
  const t = await getTranslations('shell');

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
