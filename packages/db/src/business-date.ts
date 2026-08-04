/**
 * 按门店时区取营业日 YYYY-MM-DD。
 * MVP 以当地日历日为准（不切 4am 营业分界；后续可配置）。
 */
export function getBusinessDate(timezone: string, now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // fall through
  }
  return now.toISOString().slice(0, 10);
}

export type UtcDayRange = {
  start: Date;
  end: Date;
};

function dateParts(date: string): { year: number; month: number; day: number } {
  const values = date.split('-').map(Number);
  const year = values[0] ?? 0;
  const month = values[1] ?? 0;
  const day = values[2] ?? 0;
  return { year, month, day };
}

function getZonedParts(
  date: Date,
  timezone: string,
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

function zonedMidnightToUtc(
  local: { year: number; month: number; day: number },
  timezone: string,
): Date {
  const localAsUtc = Date.UTC(local.year, local.month - 1, local.day);
  const zoned = getZonedParts(new Date(localAsUtc), timezone);
  const zonedAsUtc = Date.UTC(
    zoned.year,
    zoned.month - 1,
    zoned.day,
    zoned.hour,
    zoned.minute,
    zoned.second,
  );
  const offset = zonedAsUtc - localAsUtc;
  return new Date(localAsUtc - offset);
}

/** 返回某个 IANA 时区当天在 UTC 中的半开区间 [start, end)。 */
export function getUtcDayRange(timezone: string, now = new Date()): UtcDayRange {
  const current = dateParts(getBusinessDate(timezone, now));
  const nextDate = new Date(Date.UTC(current.year, current.month - 1, current.day + 1));
  const next = {
    year: nextDate.getUTCFullYear(),
    month: nextDate.getUTCMonth() + 1,
    day: nextDate.getUTCDate(),
  };

  try {
    return {
      start: zonedMidnightToUtc(current, timezone),
      end: zonedMidnightToUtc(next, timezone),
    };
  } catch {
    const start = new Date(Date.UTC(current.year, current.month - 1, current.day));
    return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
  }
}

/** 取餐号展示：1 → "01"，最多两位数循环到三位数。 */
export function formatPickupNumber(n: number): string {
  if (n < 10) return `0${n}`;
  return String(n);
}
