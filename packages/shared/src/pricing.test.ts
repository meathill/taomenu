import { describe, expect, it } from 'vitest';
import { BILLING_CURRENCIES } from './currency';
import { LOCALES } from './locale';
import {
  BILLING_PRICES,
  BILLING_PRODUCTS,
  getBillingCurrencyForLocale,
  getBillingPrice,
  LOCALE_TO_BILLING_CURRENCY,
} from './pricing';

describe('BILLING_PRICES', () => {
  it('每个商品在每个币种下都有正整数价格', () => {
    for (const product of BILLING_PRODUCTS) {
      for (const currency of BILLING_CURRENCIES) {
        const price = BILLING_PRICES[product][currency];
        expect(Number.isInteger(price)).toBe(true);
        expect(price).toBeGreaterThan(0);
      }
    }
  });

  it('getBillingPrice 返回配置价格', () => {
    expect(getBillingPrice('pro_plan', 'VND')).toBe(149_000);
    expect(getBillingPrice('pro_plan', 'USD')).toBe(599);
    expect(getBillingPrice('staff_seat', 'JPY')).toBe(750);
    expect(getBillingPrice('staff_seat', 'CNY')).toBe(3_500);
  });

  it('席位价格低于 Pro 套餐价格', () => {
    for (const currency of BILLING_CURRENCIES) {
      expect(getBillingPrice('staff_seat', currency)).toBeLessThan(
        getBillingPrice('pro_plan', currency),
      );
    }
  });
});

describe('getBillingCurrencyForLocale', () => {
  it('覆盖全部 UI locale', () => {
    for (const locale of LOCALES) {
      expect(BILLING_CURRENCIES).toContain(LOCALE_TO_BILLING_CURRENCY[locale]);
    }
  });

  it('按 locale 映射币种，未知 locale 回落 VND', () => {
    expect(getBillingCurrencyForLocale('vi')).toBe('VND');
    expect(getBillingCurrencyForLocale('en')).toBe('USD');
    expect(getBillingCurrencyForLocale('ja')).toBe('JPY');
    expect(getBillingCurrencyForLocale('zh')).toBe('CNY');
    expect(getBillingCurrencyForLocale('xx')).toBe('VND');
    expect(getBillingCurrencyForLocale('')).toBe('VND');
  });
});
