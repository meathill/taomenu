import { LOCALES } from '@taomenu/shared';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { routing } from '@/i18n/routing';

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
    title: {
      default: t('title'),
      template: `%s · TaoMenu`,
    },
    description: t('description'),
    icons: {
      icon: '/brand/taomenu-mark.svg',
      apple: '/brand/taomenu-mark.svg',
    },
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

  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-paper-50 text-ink-900 antialiased">
        <NextIntlClientProvider messages={messages}>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <main className="container mx-auto w-full flex-1 px-4">{children}</main>
            <SiteFooter />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
