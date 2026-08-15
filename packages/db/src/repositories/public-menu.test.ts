import { describe, expect, it } from 'vitest';
import {
  getCompleteMenuLocales,
  type PublicMenuLocaleSource,
  resolvePublicMenuLocale,
} from './public-menu';

function names(...locales: string[]) {
  return locales.map((locale) => ({ locale, name: `${locale} name` }));
}

describe('getCompleteMenuLocales', () => {
  it('只有分类、菜品、规格组和可售规格选项都完整时才公开第二语言', () => {
    const source: PublicMenuLocaleSource = [
      {
        translations: names('vi', 'en', 'zh'),
        items: [
          {
            translations: names('vi', 'en', 'zh'),
            modifierGroups: [
              {
                translations: names('vi', 'en', 'zh'),
                options: [
                  { isAvailable: true, translations: names('vi', 'en') },
                  { isAvailable: false, translations: names('vi', 'en', 'zh') },
                ],
              },
            ],
          },
        ],
      },
    ];

    expect(getCompleteMenuLocales(source, 'vi')).toEqual(['vi', 'en']);
  });

  it('空菜单仍保留基础语言', () => {
    expect(getCompleteMenuLocales([], 'ja')).toEqual(['ja']);
  });

  it('只解析完整可用的请求语言，否则回退基础语言', () => {
    expect(resolvePublicMenuLocale(['vi', 'en'], 'vi', 'en')).toBe('en');
    expect(resolvePublicMenuLocale(['vi', 'en'], 'vi', 'zh')).toBe('vi');
    expect(resolvePublicMenuLocale(['vi', 'en'], 'vi')).toBe('vi');
  });
});
