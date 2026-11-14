import { describe, expect, it } from 'vitest';
import { collectMenuLocales } from './menu-locales';
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
