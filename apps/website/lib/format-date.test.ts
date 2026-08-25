import { describe, expect, it } from 'vitest';

import { formatDate } from './format-date';

describe('formatDate', () => {
  it('正常日期按 MMM D, YYYY 格式化', () => {
    expect(formatDate('2026-08-01T00:00:00.000Z')).toBe('Aug 1, 2026');
    expect(formatDate('2026-12-31')).toBe('Dec 31, 2026');
  });

  it('无效日期原样返回', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
    expect(formatDate('')).toBe('');
  });

  it('边界：带时区的日期仍能格式化', () => {
    expect(formatDate('2026-01-15T14:30:00+07:00')).toBe('Jan 15, 2026');
  });
});
