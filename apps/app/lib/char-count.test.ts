import { describe, expect, it } from 'vitest';
import { charCountState } from './char-count';

describe('charCountState（issue #19）', () => {
  it('接近上限才显示，达到上限高亮', () => {
    expect(charCountState(10, 120)).toBe('hidden');
    expect(charCountState(96, 120)).toBe('near');
    expect(charCountState(120, 120)).toBe('limit');
  });
});
