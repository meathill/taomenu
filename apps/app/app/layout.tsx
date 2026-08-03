import { APP_NAME } from '@taomenu/shared';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

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

type RootLayoutProps = {
  children: ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-paper-50 text-ink-900 antialiased">
        <NextIntlClientProvider messages={messages}>
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
