'use client';

import { usePathname } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { type ReactNode, useEffect } from 'react';
import {
  PublicMenuLocaleProvider,
  usePublicMenuLocale,
} from '@/app/[locale]/m/use-public-menu-locale';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { CUSTOMER_UI_MESSAGES, resolveCustomerUiLocale } from '@/i18n/customer-ui-messages';
import { getSiteChrome } from '@/lib/site-chrome';

type LocaleAppShellProps = {
  fallbackLocale: string;
  websiteUrl: string;
  children: ReactNode;
};

function CustomerIntlBridge({
  fallbackLocale,
  children,
}: {
  fallbackLocale: string;
  children: ReactNode;
}) {
  const { menuLocale } = usePublicMenuLocale(fallbackLocale);
  const locale = resolveCustomerUiLocale(menuLocale, fallbackLocale);
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = locale;
    return () => {
      document.documentElement.lang = previous;
    };
  }, [locale]);
  return (
    <NextIntlClientProvider locale={locale} messages={CUSTOMER_UI_MESSAGES[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}

/** /m 顾客页：界面文案跟随已选菜单语言；其它页面保持原界面语言 */
export function LocaleAppShell({ fallbackLocale, websiteUrl, children }: LocaleAppShellProps) {
  const pathname = usePathname();
  const body = (
    <div className="flex min-h-dvh w-full min-w-0 flex-col">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter websiteUrl={websiteUrl} />
    </div>
  );
  if (getSiteChrome(pathname) !== 'customer') {
    return body;
  }
  return (
    <PublicMenuLocaleProvider fallbackLocale={fallbackLocale}>
      <CustomerIntlBridge fallbackLocale={fallbackLocale}>{body}</CustomerIntlBridge>
    </PublicMenuLocaleProvider>
  );
}
