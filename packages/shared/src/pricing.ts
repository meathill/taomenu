/** 计费商品与各币种定价（金额均为最小单位整数，见 ./currency） */

import type { BillingCurrency } from './currency';
import { isLocale, type Locale } from './locale';

export const BILLING_PRODUCTS = ['pro_plan', 'staff_seat'] as const;

export type BillingProduct = (typeof BILLING_PRODUCTS)[number];

/** 计费周期。Staff 席位目前只卖月付；年付价按月价 × ANNUAL_MONTHS_CHARGED 计算。 */
export const BILLING_INTERVALS = ['month', 'year'] as const;

export type BillingInterval = (typeof BILLING_INTERVALS)[number];

/** 年付：付 10 个月，用 12 个月（约 17% off，展示「赠送 2 个月」而非折扣折数）。 */
export const ANNUAL_MONTHS_CHARGED = 10;
export const ANNUAL_MONTHS_INCLUDED = 12;

/** 月付价格。VND/JPY 为整数主单位，USD/CNY 为分。 */
export const BILLING_PRICES: Record<BillingProduct, Record<BillingCurrency, number>> = {
  pro_plan: { VND: 149_000, USD: 599, JPY: 900, CNY: 4_200 },
  staff_seat: { VND: 125_000, USD: 498, JPY: 750, CNY: 3_500 },
};

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === 'month' || value === 'year';
}

/** 无法识别时回落月付，避免误开年付 Checkout。 */
export function parseBillingInterval(value: unknown): BillingInterval {
  return isBillingInterval(value) ? value : 'month';
}

export function getBillingPrice(
  product: BillingProduct,
  currency: BillingCurrency,
  interval: BillingInterval = 'month',
): number {
  const monthly = BILLING_PRICES[product][currency];
  return interval === 'year' ? monthly * ANNUAL_MONTHS_CHARGED : monthly;
}

/** 年付总价摊到 12 个月的约合月价（四舍五入到最小货币单位，仅用于展示）。 */
export function getAnnualEquivalentMonthlyPrice(
  product: BillingProduct,
  currency: BillingCurrency,
): number {
  return Math.round(getBillingPrice(product, currency, 'year') / ANNUAL_MONTHS_INCLUDED);
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
