import { describe, expect, it } from 'vitest';
import { resolveMenuImportTargetLocale } from './menu-ai-locale';

describe('resolveMenuImportTargetLocale', () => {
  it('同一语言的地区标签统一写入门店基础 locale', () => {
    expect(
      resolveMenuImportTargetLocale({
        baseLocale: 'vi',
        detectedLocale: 'vi-VN',
        hasExistingCategories: true,
      }),
    ).toEqual({ targetLocale: 'vi', shouldAdoptAsBaseLocale: false });
  });

  it('空菜单首次导入时采用识别语言作为基础语言', () => {
    expect(
      resolveMenuImportTargetLocale({
        baseLocale: 'en',
        detectedLocale: 'vi-VN',
        hasExistingCategories: false,
      }),
    ).toEqual({ targetLocale: 'vi-VN', shouldAdoptAsBaseLocale: true });
  });

  it('已有菜单时拒绝混入另一种基础语言', () => {
    expect(
      resolveMenuImportTargetLocale({
        baseLocale: 'en',
        detectedLocale: 'vi-VN',
        hasExistingCategories: true,
      }),
    ).toBeNull();
  });
});
