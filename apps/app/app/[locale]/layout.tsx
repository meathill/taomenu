import { APP_NAME, isLocale } from '@taomenu/shared';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { pickMessages } from '@/i18n/load-messages';
import { SHELL_NAMESPACES } from '@/i18n/namespaces';
import { routing } from '@/i18n/routing';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('meta');
  return {
    title: {
      default: APP_NAME,
      template: `%s · ${APP_NAME}`,
    },
    description: t('description'),
    applicationName: APP_NAME,
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: APP_NAME,
    },
    icons: {
      apple: '/icons/icon-192.png',
    },
    formatDetection: {
      telephone: false,
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#2E6F5E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-paper-50 text-ink-900 antialiased">
        {/* 只下发壳层字典；各页面用 PageMessages 追加本页 namespace */}
        <NextIntlClientProvider messages={pickMessages(messages, SHELL_NAMESPACES)}>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
