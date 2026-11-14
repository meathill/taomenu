'use client';

import { APP_NAME } from '@taomenu/shared';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { usePoweredByVisibility } from '@/lib/powered-by-visibility';
import { getPoweredByUrl, getSiteChrome } from '@/lib/site-chrome';

export function SiteFooter({ websiteUrl }: { websiteUrl: string }) {
  const pathname = usePathname();
  const t = useTranslations('shell');
  const chrome = getSiteChrome(pathname);
  const poweredByVisible = usePoweredByVisibility();

  if (chrome === 'workspace') {
    return null;
  }

  if (chrome === 'customer') {
    // 顾客页只留一行小字，兼作获客入口；Pro 商家可在设置里隐藏（issue #26，服务端已按套餐判定）
    if (poweredByVisible !== true) {
      return null;
    }
    return (
      <footer className="mt-auto py-4 text-center text-xs text-muted-foreground">
        <a
          href={getPoweredByUrl(websiteUrl)}
          target="_blank"
          rel="noopener"
          className="hover:text-ink-900"
        >
          {t('poweredBy', { app: APP_NAME })}
        </a>
      </footer>
    );
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
