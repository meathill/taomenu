import { describe, expect, it } from 'vitest';
import { resolvePreferredMenuLocale } from './use-public-menu-locale';

describe('resolvePreferredMenuLocale', () => {
  it('已选语言优先于 URL 和界面语言，避免切换后被旧的 searchParams 打回', () => {
    expect(resolvePreferredMenuLocale('en', 'vi', 'vi')).toBe('en');
    expect(resolvePreferredMenuLocale(null, 'en', 'vi')).toBe('en');
    expect(resolvePreferredMenuLocale(null, null, 'vi')).toBe('vi');
  });
});
