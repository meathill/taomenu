import { describe, expect, it } from 'vitest';
import { getMenuSubtitleKey, resolveActiveMenuLocale } from './menu-page-copy';

describe('菜单页方案说明', () => {
  it('Pro 门店不显示 Free 方案限制', () => {
    expect(getMenuSubtitleKey('free')).toBe('subtitle');
    expect(getMenuSubtitleKey('pro')).toBe('subtitlePro');
  });
});

describe('resolveActiveMenuLocale', () => {
  it('Free 可以切到第二种语言，但不能切到第三种', () => {
    expect(
      resolveActiveMenuLocale({
        plan: 'free',
        baseLocale: 'vi',
        requested: 'en',
        existingLocales: ['vi'],
      }),
    ).toBe('en');
    expect(
      resolveActiveMenuLocale({
        plan: 'free',
        baseLocale: 'vi',
        requested: 'zh',
        existingLocales: ['vi', 'en'],
      }),
    ).toBe('vi');
  });

  it('未请求或不受支持的语言退回基础语言', () => {
    expect(
      resolveActiveMenuLocale({
        plan: 'free',
        baseLocale: 'vi',
        requested: undefined,
        existingLocales: ['vi'],
      }),
    ).toBe('vi');
    expect(
      resolveActiveMenuLocale({
        plan: 'pro',
        baseLocale: 'vi',
        requested: 'fr',
        existingLocales: ['vi'],
      }),
    ).toBe('vi');
  });
});
