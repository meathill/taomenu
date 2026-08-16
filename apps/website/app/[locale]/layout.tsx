import { APP_NAME, LOCALES } from '@taomenu/shared';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { JsonLd } from '@/components/json-ld';
import { RefPassthrough } from '@/components/ref-passthrough';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { routing } from '@/i18n/routing';
import { absoluteWebsiteUrl, buildAlternates } from '@/lib/seo';
import { getPublicAppUrl, getPublicWebsiteUrl } from '@/lib/site';

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
  const websiteUrl = getPublicWebsiteUrl();

  return {
    metadataBase: new URL(websiteUrl),
    title: {
      default: t('title'),
      template: `%s · TaoMenu`,
    },
    description: t('description'),
    icons: {
      icon: '/brand/taomenu-mark.svg',
      apple: '/brand/taomenu-mark.svg',
    },
    alternates: buildAlternates(locale, ''),
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: absoluteWebsiteUrl(`/${locale}`),
      siteName: APP_NAME,
      locale,
      type: 'website',
      images: [
        {
          url: absoluteWebsiteUrl('/brand/og-default.png'),
          width: 1200,
          height: 630,
          alt: APP_NAME,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: [absoluteWebsiteUrl('/brand/og-default.png')],
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
  const websiteUrl = getPublicWebsiteUrl();

  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-paper-50 text-ink-900 antialiased">
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: APP_NAME,
            url: websiteUrl,
            logo: absoluteWebsiteUrl('/brand/taomenu-mark.svg'),
          }}
        />
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: APP_NAME,
            url: websiteUrl,
            inLanguage: locale,
          }}
        />
        <RefPassthrough appUrl={getPublicAppUrl()} />
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
