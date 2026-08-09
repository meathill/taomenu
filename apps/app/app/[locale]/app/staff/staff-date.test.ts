import { describe, expect, it } from 'vitest';
import { formatStaffDate } from './staff-date';

describe('formatStaffDate', () => {
  it('按中文界面和门店时区显示日期', () => {
    expect(formatStaffDate('2026-08-07T16:21:00.000Z', 'zh', 'Asia/Ho_Chi_Minh')).toContain(
      '2026年8月7日',
    );
  });

  it('空日期显示占位符', () => {
    expect(formatStaffDate(null, 'zh', 'Asia/Ho_Chi_Minh')).toBe('—');
  });
});
