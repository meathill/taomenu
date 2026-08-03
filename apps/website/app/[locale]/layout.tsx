import { APP_NAME, LOCALES } from '@taomenu/shared';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { Link, routing } from '@/i18n/routing';
import { getAppLoginUrl, getAppSignupUrl } from '@/lib/site';

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      languages: Object.fromEntries(LOCALES.map((code) => [code, `/${code}`])),
    },
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const t = await getTranslations('nav');
  const tFooter = await getTranslations('footer');

  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-paper-50 text-ink-900">
        <NextIntlClientProvider messages={messages}>
          <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4">
            <header className="flex items-center justify-between gap-4 py-5">
              <Link href="/" className="text-lg font-bold tracking-tight text-brand-600">
                {APP_NAME}
              </Link>
              <nav className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                <LocaleSwitcher label={t('language')} />
                <Link
                  href="/pricing"
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-brand-50"
                >
                  {t('pricing')}
                </Link>
                <a
                  href={getAppLoginUrl()}
                  className="rounded-xl px-3 py-2 text-sm font-semibold text-ink-900 hover:bg-brand-50"
                >
                  {t('login')}
                </a>
                <a
                  href={getAppSignupUrl()}
                  className="inline-flex min-h-12 items-center rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
                >
                  {t('cta')}
                </a>
              </nav>
            </header>
            <main className="flex-1 pb-16">{children}</main>
            <footer className="border-t border-border py-8 text-sm text-muted-foreground">
              <p className="font-semibold text-ink-900">{APP_NAME}</p>
              <p className="mt-1">{tFooter('tagline')}</p>
            </footer>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
