import { describe, expect, it } from 'vitest';
import { getMenuSubtitleKey } from './menu-page-copy';

describe('菜单页方案说明', () => {
  it('Pro 门店不显示 Free 方案限制', () => {
    expect(getMenuSubtitleKey('free')).toBe('subtitle');
    expect(getMenuSubtitleKey('pro')).toBe('subtitlePro');
  });
});
