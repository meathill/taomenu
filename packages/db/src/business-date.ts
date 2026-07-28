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

/** 取餐号展示：1 → "01"，最多两位数循环到三位数。 */
export function formatPickupNumber(n: number): string {
  if (n < 10) return `0${n}`;
  return String(n);
}
