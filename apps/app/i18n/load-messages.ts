import type { AbstractIntlMessages } from 'next-intl';
import { MESSAGE_NAMESPACES, type MessageNamespace } from './namespaces';

type LocaleModule = { default: AbstractIntlMessages };

async function importNamespace(
  locale: string,
  ns: MessageNamespace,
): Promise<AbstractIntlMessages> {
  switch (ns) {
    case 'meta':
      return ((await import(`../messages/${locale}/meta.json`)) as LocaleModule).default;
    case 'common':
      return ((await import(`../messages/${locale}/common.json`)) as LocaleModule).default;
    case 'shell':
      return ((await import(`../messages/${locale}/shell.json`)) as LocaleModule).default;
    case 'login':
      return ((await import(`../messages/${locale}/login.json`)) as LocaleModule).default;
    case 'owner':
      return ((await import(`../messages/${locale}/owner.json`)) as LocaleModule).default;
    case 'onboarding':
      return ((await import(`../messages/${locale}/onboarding.json`)) as LocaleModule).default;
    case 'menu':
      return ((await import(`../messages/${locale}/menu.json`)) as LocaleModule).default;
    case 'tables':
      return ((await import(`../messages/${locale}/tables.json`)) as LocaleModule).default;
    case 'terminal':
      return ((await import(`../messages/${locale}/terminal.json`)) as LocaleModule).default;
    case 'customer':
      return ((await import(`../messages/${locale}/customer.json`)) as LocaleModule).default;
    case 'admin':
      return ((await import(`../messages/${locale}/admin.json`)) as LocaleModule).default;
    case 'agent':
      return ((await import(`../messages/${locale}/agent.json`)) as LocaleModule).default;
    default: {
      const _exhaustive: never = ns;
      return _exhaustive;
    }
  }
}

/** 加载完整字典（服务端 getTranslations 用） */
export async function loadAllMessages(locale: string): Promise<AbstractIntlMessages> {
  const entries = await Promise.all(
    MESSAGE_NAMESPACES.map(async (ns) => [ns, await importNamespace(locale, ns)] as const),
  );
  return Object.fromEntries(entries);
}

/** 只加载指定命名空间（客户端 Provider 减负） */
export async function loadMessages(
  locale: string,
  namespaces: readonly MessageNamespace[],
): Promise<AbstractIntlMessages> {
  const unique = [...new Set(namespaces)];
  const entries = await Promise.all(
    unique.map(async (ns) => [ns, await importNamespace(locale, ns)] as const),
  );
  return Object.fromEntries(entries);
}

/** 从完整 messages 中挑出子集 */
export function pickMessages(
  all: AbstractIntlMessages,
  namespaces: readonly MessageNamespace[],
): AbstractIntlMessages {
  const out: AbstractIntlMessages = {};
  for (const ns of namespaces) {
    if (ns in all) {
      out[ns] = all[ns] as AbstractIntlMessages[string];
    }
  }
  return out;
}
