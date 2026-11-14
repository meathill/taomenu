/** 店铺时区：IANA 名称校验、默认值，以及店主能看懂的下拉文案（纯函数，前后端共用） */

import type { StoreCurrency } from './currency';

export const DEFAULT_STORE_TIMEZONE = 'Asia/Ho_Chi_Minh';

/**
 * 常见时区靠前，方便店主选择。越南排第一（当前主要市场），
 * 其余按本产品常见客群排列，不是完整 IANA 列表。
 */
export const COMMON_TIME_ZONES = [
  'Asia/Ho_Chi_Minh',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Singapore',
  'Asia/Kuala_Lumpur',
  'Asia/Manila',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Taipei',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Asia/Kolkata',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
] as const;

/** 下拉框里用国家/城市名，而不是 Asia/Ho_Chi_Minh 这种技术名称 */
export const TIME_ZONE_NAME_KEYS = {
  'Asia/Ho_Chi_Minh': 'timeZoneVietnam',
  'Asia/Saigon': 'timeZoneVietnam',
  'Asia/Bangkok': 'timeZoneThailand',
  'Asia/Jakarta': 'timeZoneIndonesia',
  'Asia/Singapore': 'timeZoneSingapore',
  'Asia/Kuala_Lumpur': 'timeZoneMalaysia',
  'Asia/Manila': 'timeZonePhilippines',
  'Asia/Shanghai': 'timeZoneChina',
  'Asia/Hong_Kong': 'timeZoneHongKong',
  'Asia/Taipei': 'timeZoneTaiwan',
  'Asia/Tokyo': 'timeZoneJapan',
  'Asia/Seoul': 'timeZoneKorea',
  'Asia/Kolkata': 'timeZoneIndia',
  'Europe/London': 'timeZoneUnitedKingdom',
  'Europe/Paris': 'timeZoneFrance',
  'America/New_York': 'timeZoneNewYork',
  'America/Chicago': 'timeZoneChicago',
  'America/Los_Angeles': 'timeZoneLosAngeles',
  'Australia/Sydney': 'timeZoneSydney',
} as const;

export type TimeZoneNameKey = (typeof TIME_ZONE_NAME_KEYS)[keyof typeof TIME_ZONE_NAME_KEYS];

const LOCALE_TIME_ZONES: Record<string, string> = {
  vi: 'Asia/Ho_Chi_Minh',
  zh: 'Asia/Shanghai',
  ja: 'Asia/Tokyo',
};

/** 币种能唯一对应一个国家时，作为默认时区（VND → 越南） */
const CURRENCY_TIME_ZONES: Partial<Record<StoreCurrency, string>> = {
  VND: 'Asia/Ho_Chi_Minh',
  JPY: 'Asia/Tokyo',
  CNY: 'Asia/Shanghai',
  KRW: 'Asia/Seoul',
  THB: 'Asia/Bangkok',
  SGD: 'Asia/Singapore',
  MYR: 'Asia/Kuala_Lumpur',
  IDR: 'Asia/Jakarta',
  PHP: 'Asia/Manila',
  HKD: 'Asia/Hong_Kong',
  TWD: 'Asia/Taipei',
  GBP: 'Europe/London',
  AUD: 'Australia/Sydney',
};

/** 是否为运行时可识别的 IANA 时区（如 Europe/Paris）；拒绝空串与随意文本 */
export function isValidTimeZone(value: string): boolean {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export type ResolveDefaultTimeZoneOptions = {
  currency?: string | null;
  locale?: string | null;
};

/**
 * 新店默认时区：有明确币种（尤其是 VND → 越南）时优先用币种；
 * 否则用浏览器时区；再不行按界面语言；最后退回越南。
 */
export function resolveDefaultTimeZone(
  detected: string | null | undefined,
  options?: ResolveDefaultTimeZoneOptions,
): string {
  const fromCurrency = guessTimeZoneFromCurrency(options?.currency);
  if (fromCurrency) return fromCurrency;
  if (detected && isValidTimeZone(detected)) return detected;
  const locale = options?.locale?.split('-')[0];
  if (locale && LOCALE_TIME_ZONES[locale]) return LOCALE_TIME_ZONES[locale];
  return DEFAULT_STORE_TIMEZONE;
}

/** 单一国家币种 → 默认时区；美元/欧元等跨多时区的不猜，返回 null */
export function guessTimeZoneFromCurrency(currency: string | null | undefined): string | null {
  if (!currency) return null;
  return CURRENCY_TIME_ZONES[currency as StoreCurrency] ?? null;
}

/** 下拉框的候选时区：常见项在前，其余按字母排，并保证当前值一定在列表里 */
export function listTimeZones(current?: string): string[] {
  const supported =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  const zones = new Set<string>(supported);
  for (const zone of COMMON_TIME_ZONES) {
    zones.add(zone);
  }
  zones.add(DEFAULT_STORE_TIMEZONE);
  if (current) zones.add(current);

  const common: string[] = [];
  const seen = new Set<string>();
  for (const zone of COMMON_TIME_ZONES) {
    if (zones.has(zone) && !seen.has(zone)) {
      common.push(zone);
      seen.add(zone);
    }
  }
  const rest = [...zones].filter((zone) => !seen.has(zone)).sort();
  return [...common, ...rest];
}

/** 把 "GMT+07:00" / "UTC+7" 收成店主能看懂的 "GMT+7" */
export function formatGmtOffset(timeZone: string, date: Date = new Date()): string {
  try {
    const name = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value;
    if (name) return normalizeGmtOffset(name);
  } catch {
    // 旧运行时没有 shortOffset 时走分钟差计算
  }
  return offsetFromTimeZone(timeZone, date);
}

export function timeZoneFallbackName(timeZone: string): string {
  const city = timeZone.split('/').pop();
  return (city ?? timeZone).replaceAll('_', ' ');
}

/** 例如 "Việt Nam (GMT+7)" */
export function formatTimeZoneLabel(timeZone: string, displayName: string, date?: Date): string {
  return `${displayName} (${formatGmtOffset(timeZone, date)})`;
}

function normalizeGmtOffset(name: string): string {
  const raw = name.replace(/^UTC/i, 'GMT');
  const match = raw.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) {
    return raw.startsWith('GMT') ? raw : `GMT${raw}`;
  }
  const hours = String(Number(match[2]));
  const minutes = match[3] && match[3] !== '00' ? `:${match[3]}` : '';
  return `GMT${match[1]}${hours}${minutes}`;
}

function offsetFromTimeZone(timeZone: string, date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    read('hour'),
    read('minute'),
    read('second'),
  );
  const diffMinutes = Math.round((asUtc - date.getTime()) / 60000);
  const sign = diffMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(diffMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return minutes === 0
    ? `GMT${sign}${hours}`
    : `GMT${sign}${hours}:${String(minutes).padStart(2, '0')}`;
}
