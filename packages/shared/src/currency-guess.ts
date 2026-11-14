import type { StoreCurrency } from './currency';

const EXACT: Record<string, StoreCurrency> = {
  'Asia/Ho_Chi_Minh': 'VND',
  'Asia/Saigon': 'VND',
  'Asia/Tokyo': 'JPY',
  'Asia/Shanghai': 'CNY',
  'Asia/Chongqing': 'CNY',
  'Asia/Urumqi': 'CNY',
  'Asia/Seoul': 'KRW',
  'Asia/Bangkok': 'THB',
  'Asia/Singapore': 'SGD',
  'Asia/Kuala_Lumpur': 'MYR',
  'Asia/Jakarta': 'IDR',
  'Asia/Makassar': 'IDR',
  'Asia/Jayapura': 'IDR',
  'Asia/Manila': 'PHP',
  'Asia/Hong_Kong': 'HKD',
  'Asia/Taipei': 'TWD',
  'Europe/London': 'GBP',
  'America/New_York': 'USD',
  'America/Chicago': 'USD',
  'America/Denver': 'USD',
  'America/Phoenix': 'USD',
  'America/Los_Angeles': 'USD',
  'America/Anchorage': 'USD',
  'Pacific/Honolulu': 'USD',
};

// 欧元区之外仍在用本国货币的欧洲时区，不能按 Europe/* 一律猜成 EUR
const NON_EURO_EUROPE = new Set([
  'Europe/London',
  'Europe/Zurich',
  'Europe/Oslo',
  'Europe/Stockholm',
  'Europe/Copenhagen',
  'Europe/Warsaw',
  'Europe/Prague',
  'Europe/Budapest',
  'Europe/Bucharest',
  'Europe/Sofia',
  'Europe/Istanbul',
  'Europe/Moscow',
  'Europe/Kiev',
  'Europe/Kyiv',
  'Europe/Minsk',
  'Europe/Belgrade',
]);

/** 根据浏览器时区猜门店币种（只作为 Onboarding 的默认值，用户可改）；猜不出返回 null */
export function guessStoreCurrencyFromTimeZone(
  timeZone: string | null | undefined,
): StoreCurrency | null {
  if (!timeZone) return null;
  const exact = EXACT[timeZone];
  if (exact) return exact;
  if (timeZone.startsWith('Australia/')) return 'AUD';
  if (timeZone.startsWith('Europe/') && !NON_EURO_EUROPE.has(timeZone)) return 'EUR';
  return null;
}
