/** 计费商品与各币种定价（金额均为最小单位整数，见 ./currency） */

import type { BillingCurrency } from './currency';
import { isLocale, type Locale } from './locale';

export const BILLING_PRODUCTS = ['pro_plan', 'staff_seat'] as const;

export type BillingProduct = (typeof BILLING_PRODUCTS)[number];

/** 月付价格。VND/JPY 为整数主单位，USD/CNY 为分。 */
export const BILLING_PRICES: Record<BillingProduct, Record<BillingCurrency, number>> = {
  pro_plan: { VND: 149_000, USD: 599, JPY: 900, CNY: 4_200 },
  staff_seat: { VND: 49_000, USD: 199, JPY: 300, CNY: 1_400 },
};

export function getBillingPrice(product: BillingProduct, currency: BillingCurrency): number {
  return BILLING_PRICES[product][currency];
}

/** UI locale → 默认计费币种 */
export const LOCALE_TO_BILLING_CURRENCY: Record<Locale, BillingCurrency> = {
  vi: 'VND',
  en: 'USD',
  ja: 'JPY',
  zh: 'CNY',
};

/** 未知 locale 回落 VND */
export function getBillingCurrencyForLocale(locale: string): BillingCurrency {
  return isLocale(locale) ? LOCALE_TO_BILLING_CURRENCY[locale] : 'VND';
}
