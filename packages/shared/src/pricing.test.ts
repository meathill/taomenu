import { describe, expect, it } from 'vitest';
import { BILLING_CURRENCIES } from './currency';
import { LOCALES } from './locale';
import {
  ANNUAL_MONTHS_CHARGED,
  ANNUAL_MONTHS_INCLUDED,
  BILLING_PRICES,
  BILLING_PRODUCTS,
  getAnnualEquivalentMonthlyPrice,
  getBillingCurrencyForLocale,
  getBillingPrice,
  getChristmasProAnnualPrice,
  LOCALE_TO_BILLING_CURRENCY,
  parseBillingInterval,
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

describe('年付价格', () => {
  it('年付等于 10 个月月费，且为各币种正整数', () => {
    expect(ANNUAL_MONTHS_CHARGED).toBe(10);
    expect(ANNUAL_MONTHS_INCLUDED).toBe(12);
    expect(getBillingPrice('pro_plan', 'VND', 'year')).toBe(1_490_000);
    expect(getBillingPrice('pro_plan', 'USD', 'year')).toBe(5_990);
    expect(getBillingPrice('pro_plan', 'JPY', 'year')).toBe(9_000);
    expect(getBillingPrice('pro_plan', 'CNY', 'year')).toBe(42_000);
    expect(getBillingPrice('pro_plus_plan', 'VND', 'month')).toBe(375_000);
    expect(getBillingPrice('pro_plus_plan', 'USD', 'month')).toBe(1_499);
    expect(getBillingPrice('pro_plus_plan', 'JPY', 'month')).toBe(2_250);
    expect(getBillingPrice('pro_plus_plan', 'CNY', 'month')).toBe(10_500);
    expect(getBillingPrice('pro_plus_plan', 'VND', 'year')).toBe(3_750_000);
    expect(getBillingPrice('pro_plus_plan', 'USD', 'year')).toBe(14_990);
    expect(getBillingPrice('pro_plus_plan', 'JPY', 'year')).toBe(22_500);
    expect(getBillingPrice('pro_plus_plan', 'CNY', 'year')).toBe(105_000);
    for (const currency of BILLING_CURRENCIES) {
      const yearly = getBillingPrice('pro_plan', currency, 'year');
      expect(Number.isInteger(yearly)).toBe(true);
      expect(yearly).toBe(getBillingPrice('pro_plan', currency, 'month') * ANNUAL_MONTHS_CHARGED);
    }
  });

  it('默认仍返回月付，兼容旧调用', () => {
    expect(getBillingPrice('pro_plan', 'USD')).toBe(599);
  });

  it('约合月价按 12 个月四舍五入', () => {
    expect(getAnnualEquivalentMonthlyPrice('pro_plan', 'USD')).toBe(499);
    expect(getAnnualEquivalentMonthlyPrice('pro_plan', 'VND')).toBe(124_167);
    expect(getAnnualEquivalentMonthlyPrice('pro_plan', 'JPY')).toBe(750);
    expect(getAnnualEquivalentMonthlyPrice('pro_plan', 'CNY')).toBe(3_500);
  });

  it('parseBillingInterval 只接受 month/year，其余回落 month', () => {
    expect(parseBillingInterval('year')).toBe('year');
    expect(parseBillingInterval('month')).toBe('month');
    expect(parseBillingInterval('yearly')).toBe('month');
    expect(parseBillingInterval(undefined)).toBe('month');
  });
});

describe('圣诞年付半价', () => {
  it('各币种均为年费的一半且为整数', () => {
    expect(getChristmasProAnnualPrice('VND')).toBe(745_000);
    expect(getChristmasProAnnualPrice('USD')).toBe(2_995);
    expect(getChristmasProAnnualPrice('JPY')).toBe(4_500);
    expect(getChristmasProAnnualPrice('CNY')).toBe(21_000);
  });
});
