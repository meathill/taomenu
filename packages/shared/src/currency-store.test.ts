import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  getBillingCurrencyForStore,
  getCurrencyDecimals,
  parseCurrencyInput,
  STORE_CURRENCIES,
  toStoreCurrency,
} from './currency';
import { guessStoreCurrencyFromTimeZone } from './currency-guess';
import { createStoreSchema, updateStoreSchema } from './store';

describe('门店币种（issue #15）', () => {
  it('包含 EUR 等常用币种，且都是合法 ISO 4217', () => {
    expect(STORE_CURRENCIES).toContain('EUR');
    for (const code of STORE_CURRENCIES) {
      expect(
        () => new Intl.NumberFormat('en', { style: 'currency', currency: code }),
      ).not.toThrow();
    }
  });

  it('EUR 按 2 位小数解析与展示', () => {
    expect(getCurrencyDecimals('EUR')).toBe(2);
    expect(parseCurrencyInput('1.20', 'EUR')).toBe(120);
    expect(formatCurrency(120, 'EUR', 'fr-FR')).toMatch(/1,20\s€/);
    expect(getCurrencyDecimals('KRW')).toBe(0);
  });

  it('toStoreCurrency 保留 EUR，不再回落 VND', () => {
    expect(toStoreCurrency('EUR')).toBe('EUR');
    expect(toStoreCurrency('XXX')).toBe('VND');
  });

  it('订阅结算：可计费币种原样，其他门店币种用 USD', () => {
    expect(getBillingCurrencyForStore('JPY')).toBe('JPY');
    expect(getBillingCurrencyForStore('EUR')).toBe('USD');
    expect(getBillingCurrencyForStore(null)).toBe('VND');
  });

  it('店铺 schema 接受 EUR', () => {
    expect(
      createStoreSchema.safeParse({ name: 'A', serviceMode: 'hybrid', currency: 'EUR' }).success,
    ).toBe(true);
    expect(updateStoreSchema.safeParse({ currency: 'GBP' }).success).toBe(true);
    expect(updateStoreSchema.safeParse({ currency: 'ABC' }).success).toBe(false);
  });

  it('按时区猜默认币种', () => {
    expect(guessStoreCurrencyFromTimeZone('Europe/Paris')).toBe('EUR');
    expect(guessStoreCurrencyFromTimeZone('Europe/London')).toBe('GBP');
    expect(guessStoreCurrencyFromTimeZone('Europe/Zurich')).toBeNull();
    expect(guessStoreCurrencyFromTimeZone('Asia/Shanghai')).toBe('CNY');
    expect(guessStoreCurrencyFromTimeZone('Australia/Sydney')).toBe('AUD');
    expect(guessStoreCurrencyFromTimeZone('America/Sao_Paulo')).toBeNull();
  });
});
