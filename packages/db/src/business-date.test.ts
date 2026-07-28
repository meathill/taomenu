import { describe, expect, it } from 'vitest';
import { formatPickupNumber, getBusinessDate } from './business-date';

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
