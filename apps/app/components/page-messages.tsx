import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import type { ReactNode } from 'react';
import { pickMessages } from '@/i18n/load-messages';
import { type MessageNamespace, SHELL_NAMESPACES } from '@/i18n/namespaces';

type PageMessagesProps = {
  /** 本页额外字典（会自动带上 common + shell） */
  namespaces: readonly MessageNamespace[];
  children: ReactNode;
};

/**
 * 客户端只注入壳层 + 本页字典，避免整包 messages 下发。
 * 服务端 getTranslations 仍可访问 request 配置中的全量字典。
 */
export async function PageMessages({ namespaces, children }: PageMessagesProps) {
  const locale = await getLocale();
  const all = await getMessages();
  const merged = [...SHELL_NAMESPACES, ...namespaces] as MessageNamespace[];
  const messages = pickMessages(all, merged);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
