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

export function isBillingCurrency(value: string): value is BillingCurrency {
  return (BILLING_CURRENCIES as readonly string[]).includes(value);
}

/** 解析外部输入的币种，非法值回落 VND */
export function toBillingCurrency(value: string | null | undefined): BillingCurrency {
  return value && isBillingCurrency(value) ? value : 'VND';
}

/** 未知币种按 0 位小数处理（与 VND 一致） */
export function getCurrencyDecimals(currency: string): number {
  return isBillingCurrency(currency) ? CURRENCY_DECIMALS[currency] : 0;
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
  const decimals = getCurrencyDecimals(currency);
  if (decimals === 0) {
    return raw.replace(/\D/g, '');
  }

  const [integer = '', ...fractions] = raw.replace(/[^\d.]/g, '').split('.');
  if (fractions.length === 0) {
    return integer;
  }
  return `${integer || '0'}.${fractions.join('').slice(0, decimals)}`;
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
