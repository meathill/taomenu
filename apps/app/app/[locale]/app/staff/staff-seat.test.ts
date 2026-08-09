import { describe, expect, it } from 'vitest';
import { hasAvailableStaffSeat } from './staff-seat';

describe('hasAvailableStaffSeat', () => {
  it('已用席位达到上限时不允许继续生成配对码', () => {
    expect(hasAvailableStaffSeat(1, 1)).toBe(false);
  });

  it('仍有空余席位时允许配对', () => {
    expect(hasAvailableStaffSeat(1, 2)).toBe(true);
  });
});
