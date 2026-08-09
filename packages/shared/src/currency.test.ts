import { describe, expect, it } from 'vitest';
import {
  BILLING_CURRENCIES,
  type BillingCurrency,
  formatCurrency,
  getCurrencyDecimals,
  isBillingCurrency,
  minorAmountToDecimalString,
  minorAmountToInput,
  parseCurrencyInput,
  sanitizeCurrencyInput,
  toBillingCurrency,
} from './currency';

describe('formatCurrency', () => {
  it('VND 输出与旧版 formatVnd 完全一致：千分位点 + 普通空格 + ₫', () => {
    expect(formatCurrency(149000, 'VND', 'vi-VN')).toBe('149.000 ₫');
    expect(formatCurrency(0, 'VND', 'vi-VN')).toBe('0 ₫');
  });

  it('USD 按两位小数展示', () => {
    expect(formatCurrency(599, 'USD', 'en-US')).toBe('$5.99');
    expect(formatCurrency(500, 'USD', 'en-US')).toBe('$5.00');
  });

  it('JPY 无小数、CNY 两位小数', () => {
    const jpy = formatCurrency(900, 'JPY', 'ja-JP');
    expect(jpy).toContain('900');
    expect(jpy).not.toContain('.');

    const cny = formatCurrency(4200, 'CNY', 'zh-CN');
    expect(cny).toContain('42.00');
  });

  it('未知币种码回落为「数字 + 币种码」', () => {
    const result = formatCurrency(1234, 'XXXX', 'vi-VN');
    expect(result).toContain('1.234');
    expect(result).toContain('XXXX');
  });
});

describe('parseCurrencyInput', () => {
  it('0 位小数币种剥离非数字字符', () => {
    expect(parseCurrencyInput('149000', 'VND')).toBe(149000);
    expect(parseCurrencyInput('149,000', 'VND')).toBe(149000);
    expect(parseCurrencyInput('149.000 ₫', 'VND')).toBe(149000);
    expect(parseCurrencyInput('', 'VND')).toBeNull();
    expect(parseCurrencyInput('abc', 'VND')).toBeNull();
  });

  it('2 位小数币种按主单位解析为分', () => {
    expect(parseCurrencyInput('5.99', 'USD')).toBe(599);
    expect(parseCurrencyInput('5', 'USD')).toBe(500);
    expect(parseCurrencyInput('5.9', 'USD')).toBe(590);
    expect(parseCurrencyInput('0', 'USD')).toBe(0);
  });

  it('2 位小数币种拒绝非法输入', () => {
    expect(parseCurrencyInput('5.999', 'USD')).toBeNull();
    expect(parseCurrencyInput('abc', 'USD')).toBeNull();
    expect(parseCurrencyInput('', 'USD')).toBeNull();
    expect(parseCurrencyInput('5.9.9', 'USD')).toBeNull();
    expect(parseCurrencyInput('-5', 'USD')).toBeNull();
    expect(parseCurrencyInput('5,99', 'USD')).toBeNull();
  });
});

describe('sanitizeCurrencyInput', () => {
  it('0 位小数币种行为与旧版 replace(/\\D/g, "") 完全一致', () => {
    expect(sanitizeCurrencyInput('149000', 'VND')).toBe('149000');
    expect(sanitizeCurrencyInput('149.000', 'VND')).toBe('149000');
    expect(sanitizeCurrencyInput('12a3-4', 'VND')).toBe('1234');
    expect(sanitizeCurrencyInput('', 'VND')).toBe('');
    expect(sanitizeCurrencyInput('5.99', 'JPY')).toBe('599');
  });

  it('2 位小数币种允许输入过程中的小数点', () => {
    expect(sanitizeCurrencyInput('5', 'USD')).toBe('5');
    expect(sanitizeCurrencyInput('5.', 'USD')).toBe('5.');
    expect(sanitizeCurrencyInput('5.9', 'USD')).toBe('5.9');
    expect(sanitizeCurrencyInput('5.99', 'CNY')).toBe('5.99');
  });

  it('2 位小数币种剔除多余字符、多余小数点与超长小数', () => {
    expect(sanitizeCurrencyInput('5,9a9', 'USD')).toBe('599');
    expect(sanitizeCurrencyInput('5.9.9', 'USD')).toBe('5.99');
    expect(sanitizeCurrencyInput('5.999', 'USD')).toBe('5.99');
    expect(sanitizeCurrencyInput('-5.99', 'USD')).toBe('5.99');
    expect(sanitizeCurrencyInput('.5', 'USD')).toBe('0.5');
  });

  it('过滤结果始终能被 parseCurrencyInput 接受（除去输入中间态）', () => {
    for (const raw of ['5.99', '0.5', '12', '5,99']) {
      expect(parseCurrencyInput(sanitizeCurrencyInput(raw, 'USD'), 'USD')).not.toBeNull();
    }
  });
});

describe('minorAmountToInput', () => {
  it('按币种小数位回填', () => {
    expect(minorAmountToInput(149000, 'VND')).toBe('149000');
    expect(minorAmountToInput(900, 'JPY')).toBe('900');
    expect(minorAmountToInput(599, 'USD')).toBe('5.99');
    expect(minorAmountToInput(500, 'USD')).toBe('5.00');
    expect(minorAmountToInput(4200, 'CNY')).toBe('42.00');
  });

  it('minorAmountToDecimalString 与 minorAmountToInput 一致', () => {
    expect(minorAmountToDecimalString(599, 'USD')).toBe(minorAmountToInput(599, 'USD'));
    expect(minorAmountToDecimalString(149000, 'VND')).toBe(minorAmountToInput(149000, 'VND'));
  });

  it('parseCurrencyInput(minorAmountToInput(x)) 可往返', () => {
    const amounts = [0, 1, 199, 599, 900, 4200, 49000, 149000];
    for (const currency of BILLING_CURRENCIES) {
      for (const amount of amounts) {
        expect(parseCurrencyInput(minorAmountToInput(amount, currency), currency)).toBe(amount);
      }
    }
  });
});

describe('币种边界', () => {
  it('isBillingCurrency 只认已支持币种', () => {
    expect(isBillingCurrency('VND')).toBe(true);
    expect(isBillingCurrency('USD')).toBe(true);
    expect(isBillingCurrency('vnd')).toBe(false);
    expect(isBillingCurrency('EUR')).toBe(false);
    expect(isBillingCurrency('')).toBe(false);
  });

  it('toBillingCurrency 非法值回落 VND', () => {
    expect(toBillingCurrency('JPY')).toBe('JPY');
    expect(toBillingCurrency('EUR')).toBe('VND');
    expect(toBillingCurrency(null)).toBe('VND');
    expect(toBillingCurrency(undefined)).toBe('VND');
    expect(toBillingCurrency('')).toBe('VND');
  });

  it('getCurrencyDecimals 未知币种为 0', () => {
    const expected: Record<BillingCurrency, number> = { VND: 0, USD: 2, JPY: 0, CNY: 2 };
    for (const currency of BILLING_CURRENCIES) {
      expect(getCurrencyDecimals(currency)).toBe(expected[currency]);
    }
    expect(getCurrencyDecimals('EUR')).toBe(0);
  });
});
