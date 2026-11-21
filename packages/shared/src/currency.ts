/**
 * 计费币种。
 * 金额一律以「最小单位整数」存储和传输：VND/JPY 无小数，故最小单位即主单位；
 * USD/CNY 以「分」为最小单位（599 = $5.99）。
 */

export const BILLING_CURRENCIES = ['VND', 'USD', 'JPY', 'CNY'] as const;

export type BillingCurrency = (typeof BILLING_CURRENCIES)[number];

/** 各币种主单位的小数位数 */
export const CURRENCY_DECIMALS: Record<BillingCurrency, number> = {
  VND: 0,
  USD: 2,
  JPY: 0,
  CNY: 2,
};

/**
 * 门店币种（菜单标价用），是计费币种的超集（issue #15）。
 * 计费（Stripe）仍只支持 BILLING_CURRENCIES；其他门店币种的订阅按 USD 结算，见 getBillingCurrencyForStore。
 * 小数位采用当地菜单的习惯写法：KRW/IDR/TWD 菜单基本不写小数，按 0 位处理。
 */
export const STORE_CURRENCIES = [
  'VND',
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CNY',
  'KRW',
  'THB',
  'SGD',
  'MYR',
  'IDR',
  'PHP',
  'HKD',
  'TWD',
  'AUD',
] as const;

export type StoreCurrency = (typeof STORE_CURRENCIES)[number];

const STORE_CURRENCY_DECIMALS: Record<StoreCurrency, number> = {
  ...CURRENCY_DECIMALS,
  EUR: 2,
  GBP: 2,
  KRW: 0,
  THB: 2,
  SGD: 2,
  MYR: 2,
  IDR: 0,
  PHP: 2,
  HKD: 2,
  TWD: 0,
  AUD: 2,
};

export function isStoreCurrency(value: string): value is StoreCurrency {
  return (STORE_CURRENCIES as readonly string[]).includes(value);
}

/** 解析门店币种，非法值回落 VND */
export function toStoreCurrency(value: string | null | undefined): StoreCurrency {
  return value && isStoreCurrency(value) ? value : 'VND';
}

/** 门店订阅的结算币种：门店币种本身可计费就用它，否则用 USD（不再错误地回落到 VND） */
export function getBillingCurrencyForStore(
  storeCurrency: string | null | undefined,
): BillingCurrency {
  if (!storeCurrency) return 'VND';
  if (isBillingCurrency(storeCurrency)) return storeCurrency;
  return isStoreCurrency(storeCurrency) ? 'USD' : 'VND';
}

export function isBillingCurrency(value: string): value is BillingCurrency {
  return (BILLING_CURRENCIES as readonly string[]).includes(value);
}

/** 解析外部输入的币种，非法值回落 VND */
export function toBillingCurrency(value: string | null | undefined): BillingCurrency {
  return value && isBillingCurrency(value) ? value : 'VND';
}

/** 未知币种按 0 位小数处理（与 VND 一致） */
export function getCurrencyDecimals(currency: string): number {
  return isStoreCurrency(currency) ? STORE_CURRENCY_DECIMALS[currency] : 0;
}

/**
 * 展示用金额：amount 为最小单位整数。
 * VND 走手工拼接，因为 Intl 的 currency 样式输出的是不换行空格（U+00A0），
 * 与历史 formatVnd 的普通空格不一致，直接切换会造成展示回归。
 */
export function formatCurrency(amount: number, currency: string, locale = 'vi-VN'): string {
  const decimals = getCurrencyDecimals(currency);
  const major = amount / 10 ** decimals;

  if (currency === 'VND') {
    return `${new Intl.NumberFormat(locale).format(major)} ₫`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(major);
  } catch {
    // 币种码非法时 Intl 会抛 RangeError
    return `${new Intl.NumberFormat(locale).format(amount)} ${currency}`;
  }
}

/**
 * 用户输入（主单位）→ 最小单位整数，非法输入返回 null。
 * 0 位小数：剥离所有非数字字符（沿用旧版 `replace(/\D/g, '')` 语义，容忍千分位）。
 * 2 位小数：只接受数字与至多一个小数点，且小数不超过 2 位。
 */
export function parseCurrencyInput(raw: string, currency: string): number | null {
  const decimals = getCurrencyDecimals(currency);
  const trimmed = raw.trim();
  // 负数一律非法；0 位小数分支会剥离非数字字符，必须先拦下，否则 "-5000" 会被当成 5000
  if (trimmed.startsWith('-')) {
    return null;
  }

  let minor: number;
  if (decimals === 0) {
    const digits = trimmed.replace(/\D/g, '');
    if (digits === '') {
      return null;
    }
    minor = Number(digits);
  } else {
    const matched = new RegExp(`^(\\d+)(?:\\.(\\d{1,${decimals}}))?$`).exec(trimmed);
    if (!matched) {
      return null;
    }
    minor = Math.round(Number(trimmed) * 10 ** decimals);
  }

  return Number.isSafeInteger(minor) && minor >= 0 ? minor : null;
}

/**
 * 输入框 onChange 的温和过滤：只剔除不可能出现在金额里的字符，不做补全或纠错。
 * 0 位小数：剥离所有非数字字符（与旧版 `replace(/\D/g, '')` 完全一致）。
 * 2 位小数：只保留数字与一个小数点，小数部分截到该币种的位数；`.5` 补成 `0.5`。
 */
export function sanitizeCurrencyInput(raw: string, currency: string): string {
  // 保留开头的负号让用户看见自己输入了什么，再由 validatePriceInput 明确报错（issue #14）
  const sign = raw.trimStart().startsWith('-') ? '-' : '';
  const decimals = getCurrencyDecimals(currency);
  if (decimals === 0) {
    return sign + raw.replace(/\D/g, '');
  }

  const [integer = '', ...fractions] = raw.replace(/[^\d.]/g, '').split('.');
  if (fractions.length === 0) {
    return sign + integer;
  }
  return `${sign}${integer || '0'}.${fractions.join('').slice(0, decimals)}`;
}

export type PriceInputError = 'required' | 'negative' | 'invalid';

/** 价格输入框校验：允许 0（免费小料、白开水等），拒绝负数与非法格式。默认拒绝空值；allowEmpty 时空值表示不标价。 */
export function validatePriceInput(
  raw: string,
  currency: string,
  options?: { allowEmpty?: boolean },
): PriceInputError | null {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '-') {
    if (trimmed === '-') return 'negative';
    return options?.allowEmpty ? null : 'required';
  }
  if (trimmed.startsWith('-')) {
    return 'negative';
  }
  return parseCurrencyInput(trimmed, currency) === null ? 'invalid' : null;
}

/** 已标价（含 0 = 免费）。null/undefined = 不标价，不是免费。 */
export function hasListedPrice(amount: number | null | undefined): amount is number {
  return typeof amount === 'number';
}

/** 顾客/店主展示：有标价则格式化，否则用「询问店员」文案。 */
export function formatListedPrice(
  amount: number | null | undefined,
  currency: string,
  locale: string,
  askStaffLabel: string,
): string {
  return hasListedPrice(amount) ? formatCurrency(amount, currency, locale) : askStaffLabel;
}

/** 最小单位整数 → 主单位字符串，用于回填输入框，保证与 parseCurrencyInput 可往返 */
export function minorAmountToInput(amount: number, currency: string): string {
  return minorAmountToDecimalString(amount, currency);
}

/** 最小单位整数 → 主单位十进制字符串，用于 JSON-LD 等结构化数据 */
export function minorAmountToDecimalString(amount: number, currency: string): string {
  const decimals = getCurrencyDecimals(currency);
  const rounded = Number.isFinite(amount) ? Math.round(amount) : 0;
  return decimals === 0 ? String(rounded) : (rounded / 10 ** decimals).toFixed(decimals);
}
