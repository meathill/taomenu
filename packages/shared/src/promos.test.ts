import { describe, expect, it } from 'vitest';
import {
  BILLING_PROMOS,
  calendarDateInTimeZone,
  formatPromoEndDate,
  isChristmasPromoActive,
  isProPlusEarlyBirdActive,
  PROMO_TIME_ZONE,
  promoDaysRemaining,
} from './promos';

function atHoChiMinh(isoLocal: string): Date {
  // isoLocal like 2026-12-25T23:30:00+07:00
  return new Date(isoLocal);
}

describe('促销窗口（Asia/Ho_Chi_Minh 含结束日当天）', () => {
  it('圣诞促销在 2026-12-25 当地日结束前有效，次日失效', () => {
    expect(isChristmasPromoActive(atHoChiMinh('2026-12-25T23:59:59+07:00'))).toBe(true);
    expect(isChristmasPromoActive(atHoChiMinh('2026-12-26T00:00:00+07:00'))).toBe(false);
    expect(BILLING_PROMOS.christmas.endDate).toBe('2026-12-25');
    expect(BILLING_PROMOS.timeZone).toBe(PROMO_TIME_ZONE);
  });

  it('上海已跨日但胡志明市仍是 25 日时，圣诞促销仍有效', () => {
    // 2026-12-26 00:30 Asia/Shanghai = 2026-12-25 23:30 Asia/Ho_Chi_Minh
    expect(isChristmasPromoActive(new Date('2026-12-25T16:30:00.000Z'))).toBe(true);
  });

  it('Pro+ 早鸟在 2027-02-16 当地日结束前有效，次日失效', () => {
    expect(isProPlusEarlyBirdActive(atHoChiMinh('2027-02-16T23:59:59+07:00'))).toBe(true);
    expect(isProPlusEarlyBirdActive(atHoChiMinh('2027-02-17T00:00:00+07:00'))).toBe(false);
  });

  it('剩余天数在结束日当天为 0', () => {
    expect(promoDaysRemaining('2026-12-25', atHoChiMinh('2026-12-25T10:00:00+07:00'))).toBe(0);
    expect(promoDaysRemaining('2026-12-25', atHoChiMinh('2026-11-16T21:00:00+07:00'))).toBe(39);
  });

  it('calendarDateInTimeZone 使用指定时区', () => {
    expect(calendarDateInTimeZone(new Date('2026-12-25T16:30:00.000Z'), 'Asia/Ho_Chi_Minh')).toBe(
      '2026-12-25',
    );
    expect(calendarDateInTimeZone(new Date('2026-12-25T16:30:00.000Z'), 'Asia/Shanghai')).toBe(
      '2026-12-26',
    );
  });

  it('结束日按语言格式化且不因时区错日', () => {
    expect(formatPromoEndDate('2026-12-25', 'en')).toContain('December');
    expect(formatPromoEndDate('2026-12-25', 'en')).toContain('25');
    expect(formatPromoEndDate('2026-12-25', 'zh')).toContain('2026');
    expect(formatPromoEndDate('2027-02-16', 'vi')).toContain('2027');
    expect(formatPromoEndDate('2027-02-16', 'en', 'short')).toBe('Feb 16, 2027');
    expect(formatPromoEndDate('2026-12-25', 'zh', 'short')).toBe('2026年12月25日');
  });
});
