/** 促销窗口的唯一配置处。日期为当地日历日（含当日结束），时区固定为越南。 */

export const PROMO_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export const BILLING_PROMOS = {
  timeZone: PROMO_TIME_ZONE,
  /** Pro 月付首月免费 或 年付半价，二选一、不可叠加。含 2026-12-25 当地日当日。 */
  christmas: {
    endDate: '2026-12-25',
  },
  /** Pro+ 早鸟价等同 Pro；含 2027-02-16 当地日当日。之后新购恢复标价。 */
  proPlusEarlyBird: {
    endDate: '2027-02-16',
  },
} as const;

/** 返回 timeZone 下的当天日历日 YYYY-MM-DD */
export function calendarDateInTimeZone(now: Date, timeZone: string = PROMO_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** endDate（YYYY-MM-DD）含当天当地日结束 */
export function isOnOrBeforeEndDate(
  endDate: string,
  now: Date = new Date(),
  timeZone: string = PROMO_TIME_ZONE,
): boolean {
  return calendarDateInTimeZone(now, timeZone) <= endDate;
}

export function isChristmasPromoActive(now: Date = new Date()): boolean {
  return isOnOrBeforeEndDate(BILLING_PROMOS.christmas.endDate, now, BILLING_PROMOS.timeZone);
}

export function isProPlusEarlyBirdActive(now: Date = new Date()): boolean {
  return isOnOrBeforeEndDate(BILLING_PROMOS.proPlusEarlyBird.endDate, now, BILLING_PROMOS.timeZone);
}

/** 含结束日当天：结束日为 0 表示最后一天。 */
export function promoDaysRemaining(
  endDate: string,
  now: Date = new Date(),
  timeZone: string = PROMO_TIME_ZONE,
): number {
  const today = calendarDateInTimeZone(now, timeZone);
  const todayUtc = Date.parse(`${today}T00:00:00Z`);
  const endUtc = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(todayUtc) || Number.isNaN(endUtc)) return 0;
  return Math.max(0, Math.round((endUtc - todayUtc) / 86_400_000));
}

const DATE_LOCALE: Record<string, string> = {
  en: 'en-US',
  vi: 'vi-VN',
  zh: 'zh-CN',
  ja: 'ja-JP',
};

/** 把配置里的结束日格式化为店主语言，不随浏览时区错日。short 用缩写月份（价签等窄位置）。 */
export function formatPromoEndDate(
  endDate: string,
  locale: string,
  monthStyle: 'long' | 'short' = 'long',
): string {
  const [year, month, day] = endDate.split('-').map(Number);
  if (!year || !month || !day) return endDate;
  const intlLocale = DATE_LOCALE[locale] ?? 'en-US';
  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: monthStyle,
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
