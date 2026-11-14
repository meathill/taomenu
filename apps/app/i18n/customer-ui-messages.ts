import { DEFAULT_LOCALE, isLocale, type Locale } from '@taomenu/shared';
import type { AbstractIntlMessages } from 'next-intl';
import commonEn from '../messages/en/common.json';
import customerEn from '../messages/en/customer.json';
import shellEn from '../messages/en/shell.json';
import commonJa from '../messages/ja/common.json';
import customerJa from '../messages/ja/customer.json';
import shellJa from '../messages/ja/shell.json';
import commonVi from '../messages/vi/common.json';
import customerVi from '../messages/vi/customer.json';
import shellVi from '../messages/vi/shell.json';
import commonZh from '../messages/zh/common.json';
import customerZh from '../messages/zh/customer.json';
import shellZh from '../messages/zh/shell.json';

/** 顾客页会用到的客户端字典（壳层 + 点单文案） */
export const CUSTOMER_UI_MESSAGES: Record<Locale, AbstractIntlMessages> = {
  en: { common: commonEn, shell: shellEn, customer: customerEn },
  vi: { common: commonVi, shell: shellVi, customer: customerVi },
  ja: { common: commonJa, shell: shellJa, customer: customerJa },
  zh: { common: commonZh, shell: shellZh, customer: customerZh },
};

/** 菜单语言有界面译文时用它，否则回退到当前界面语言 */
export function resolveCustomerUiLocale(menuLocale: string, fallbackLocale: string): Locale {
  if (isLocale(menuLocale)) return menuLocale;
  if (isLocale(fallbackLocale)) return fallbackLocale;
  return DEFAULT_LOCALE;
}
