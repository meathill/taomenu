import { describe, expect, it } from 'vitest';
import { formatPickupNumber, getBusinessDate, getUtcDayRange } from './business-date';

describe('getBusinessDate', () => {
  it('返回 YYYY-MM-DD', () => {
    const date = getBusinessDate('Asia/Ho_Chi_Minh', new Date('2026-07-28T10:00:00Z'));
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('formatPickupNumber', () => {
  it('补零一位数', () => {
    expect(formatPickupNumber(1)).toBe('01');
    expect(formatPickupNumber(12)).toBe('12');
  });
});

describe('getUtcDayRange', () => {
  it('按越南时区计算当地日历日边界', () => {
    const range = getUtcDayRange('Asia/Ho_Chi_Minh', new Date('2026-08-04T16:30:00Z'));
    expect(range.start.toISOString()).toBe('2026-08-03T17:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-08-04T17:00:00.000Z');
  });

  it('处理跨 UTC 日期的当地日历日', () => {
    const range = getUtcDayRange('Asia/Ho_Chi_Minh', new Date('2026-08-04T17:00:00Z'));
    expect(range.start.toISOString()).toBe('2026-08-04T17:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-08-05T17:00:00.000Z');
  });
});
