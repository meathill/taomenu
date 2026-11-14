import { describe, expect, it } from 'vitest';
import { collectMenuLocales, isMenuLocaleLocked, occupiedMenuLocales } from './menu-locales';
import type { MenuTree } from './menu-types';

describe('collectMenuLocales', () => {
  it('始终包含基础语言，并收集菜品上的其它语言', () => {
    const tree = {
      menu: { baseLocale: 'vi' },
      categories: [
        {
          translations: [{ locale: 'vi' }],
          items: [
            {
              translations: [{ locale: 'vi' }, { locale: 'en' }],
              modifierGroups: [],
            },
          ],
        },
      ],
    } as unknown as MenuTree;
    expect(collectMenuLocales(tree, 'vi').sort()).toEqual(['en', 'vi']);
  });
});

describe('occupiedMenuLocales / isMenuLocaleLocked', () => {
  it('Free 选了第二种语言（即使还没有译文）后，第三种语言要上锁', () => {
    expect(
      occupiedMenuLocales({
        existingLocales: ['vi'],
        baseLocale: 'vi',
        activeLocale: 'en',
      }).sort(),
    ).toEqual(['en', 'vi']);
    expect(
      isMenuLocaleLocked({
        plan: 'free',
        baseLocale: 'vi',
        locale: 'ja',
        existingLocales: ['vi'],
        activeLocale: 'en',
      }),
    ).toBe(true);
    expect(
      isMenuLocaleLocked({
        plan: 'free',
        baseLocale: 'vi',
        locale: 'en',
        existingLocales: ['vi'],
        activeLocale: 'en',
      }),
    ).toBe(false);
  });

  it('Free 只占基础语言时，还可以选第一种额外语言', () => {
    expect(
      isMenuLocaleLocked({
        plan: 'free',
        baseLocale: 'vi',
        locale: 'en',
        existingLocales: ['vi'],
        activeLocale: 'vi',
      }),
    ).toBe(false);
  });

  it('已记录的预占语言也占用名额', () => {
    expect(
      isMenuLocaleLocked({
        plan: 'free',
        baseLocale: 'vi',
        locale: 'ja',
        existingLocales: ['vi'],
        activeLocale: 'vi',
        reservedLocales: ['en'],
      }),
    ).toBe(true);
  });
});
