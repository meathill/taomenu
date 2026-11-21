import { describe, expect, it } from 'vitest';
import { assertLocaleAllowed, type PublishableMenu, validateMenuForPublish } from './menu-publish';

function sampleMenu(overrides?: Partial<PublishableMenu>): PublishableMenu {
  return {
    categories: [
      {
        id: 'cat-1',
        isAvailable: true,
        translations: [{ locale: 'vi', name: 'Món chính' }],
        items: [
          {
            id: 'item-1',
            priceAmount: 45000,
            isAvailable: true,
            translations: [{ locale: 'vi', name: 'Phở bò' }],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('validateMenuForPublish', () => {
  it('合法菜单无错误', () => {
    expect(validateMenuForPublish({ menu: sampleMenu(), baseLocale: 'vi', plan: 'free' })).toEqual(
      [],
    );
  });

  it('空菜单报错', () => {
    const issues = validateMenuForPublish({
      menu: { categories: [] },
      baseLocale: 'vi',
      plan: 'free',
    });
    expect(issues.some((i) => i.code === 'EMPTY_MENU')).toBe(true);
  });

  it('缺少基础语言菜名', () => {
    const menu = sampleMenu();
    menu.categories[0]!.items[0]!.translations = [{ locale: 'en', name: 'Pho' }];
    const issues = validateMenuForPublish({ menu, baseLocale: 'vi', plan: 'pro' });
    expect(issues.some((i) => i.code === 'ITEM_MISSING_BASE_LOCALE')).toBe(true);
  });

  it('Free 可以发布基础语言加 1 种，但不能发布第 3 种', () => {
    const menu = sampleMenu();
    menu.categories[0]!.items[0]!.translations.push({ locale: 'en', name: 'Beef pho' });
    expect(
      validateMenuForPublish({ menu, baseLocale: 'vi', plan: 'free' }).filter(
        (i) => i.code === 'TOO_MANY_LOCALES',
      ),
    ).toHaveLength(0);
    menu.categories[0]!.items[0]!.translations.push({ locale: 'zh', name: '牛肉粉' });
    const issues = validateMenuForPublish({ menu, baseLocale: 'vi', plan: 'free' });
    expect(issues.some((i) => i.code === 'TOO_MANY_LOCALES')).toBe(true);
  });

  it('Pro 允许多语言', () => {
    const menu = sampleMenu();
    menu.categories[0]!.items[0]!.translations.push({ locale: 'en', name: 'Beef pho' });
    const issues = validateMenuForPublish({ menu, baseLocale: 'vi', plan: 'pro' });
    expect(issues.filter((i) => i.code === 'TOO_MANY_LOCALES')).toHaveLength(0);
  });

  it('不标价可以发布，负数价格不能发布，0 仍合法', () => {
    const menu = sampleMenu();
    menu.categories[0]!.items[0]!.priceAmount = null;
    expect(validateMenuForPublish({ menu, baseLocale: 'vi', plan: 'free' })).toEqual([]);
    menu.categories[0]!.items[0]!.priceAmount = 0;
    expect(validateMenuForPublish({ menu, baseLocale: 'vi', plan: 'free' })).toEqual([]);
    menu.categories[0]!.items[0]!.priceAmount = -1 as unknown as number;
    const issues = validateMenuForPublish({ menu, baseLocale: 'vi', plan: 'free' });
    expect(issues.some((i) => i.code === 'INVALID_PRICE')).toBe(true);
  });

  it('无可用菜品不能发布', () => {
    const menu = sampleMenu();
    menu.categories[0]!.items[0]!.isAvailable = false;
    const issues = validateMenuForPublish({ menu, baseLocale: 'vi', plan: 'free' });
    expect(issues.some((i) => i.code === 'NO_AVAILABLE_ITEM')).toBe(true);
  });
});

describe('assertLocaleAllowed', () => {
  it('Free 允许第二语言，拒绝第三语言', () => {
    expect(
      assertLocaleAllowed({
        plan: 'free',
        baseLocale: 'vi',
        locale: 'en',
        existingLocales: ['vi'],
      }),
    ).toBeNull();
    const issue = assertLocaleAllowed({
      plan: 'free',
      baseLocale: 'vi',
      locale: 'zh',
      existingLocales: ['vi', 'en'],
    });
    expect(issue?.code).toBe('TOO_MANY_LOCALES');
  });

  it('baseLocale 始终允许', () => {
    expect(
      assertLocaleAllowed({
        plan: 'free',
        baseLocale: 'vi',
        locale: 'vi',
        existingLocales: ['vi'],
      }),
    ).toBeNull();
  });

  it('Pro 达到五种语言后拒绝第六种语言', () => {
    const issue = assertLocaleAllowed({
      plan: 'pro',
      baseLocale: 'vi',
      locale: 'de',
      existingLocales: ['vi', 'en', 'zh', 'ja', 'fr'],
    });
    expect(issue?.code).toBe('TOO_MANY_LOCALES');
  });
});
