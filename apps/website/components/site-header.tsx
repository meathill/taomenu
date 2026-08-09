import { APP_NAME } from '@taomenu/shared';
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { getAppLoginUrl, getAppSignupUrl } from '@/lib/site';

export async function SiteHeader() {
  const t = await getTranslations('nav');

  return (
    <header className="border-b border-border/80 bg-paper-50/90 backdrop-blur-sm">
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-brand-600"
        >
          <Image
            src="/brand/taomenu-mark.svg"
            alt=""
            aria-hidden="true"
            width={32}
            height={32}
            className="size-8 rounded-lg"
          />
          <span>{APP_NAME}</span>
        </Link>
        <nav
          className="flex flex-wrap items-center justify-end gap-1 sm:gap-2"
          aria-label="Primary"
        >
          <Link
            href="/pricing"
            className="rounded-xl px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-brand-50"
          >
            {t('pricing')}
          </Link>
          <Link
            href="/about"
            className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-brand-50 sm:inline-flex"
          >
            {t('about')}
          </Link>
          <a
            href={getAppLoginUrl()}
            className="rounded-xl px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-brand-50"
          >
            {t('login')}
          </a>
          <a
            href={getAppSignupUrl()}
            className="inline-flex min-h-11 items-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
          >
            {t('cta')}
          </a>
        </nav>
      </div>
    </header>
  );
}
