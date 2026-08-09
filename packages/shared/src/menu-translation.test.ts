import { describe, expect, it } from 'vitest';
import { menuTranslationOutputSchema } from './menu-translation';

describe('菜单翻译输出 schema', () => {
  it('接受带原实体 id 的完整翻译', () => {
    expect(
      menuTranslationOutputSchema.parse({
        translations: [
          {
            entityType: 'item',
            entityId: '00000000-0000-4000-8000-000000000001',
            name: 'Beef pho',
            description: null,
          },
        ],
      }).translations,
    ).toHaveLength(1);
  });

  it('拒绝未知实体类型', () => {
    expect(
      menuTranslationOutputSchema.safeParse({
        translations: [
          {
            entityType: 'price',
            entityId: '00000000-0000-4000-8000-000000000001',
            name: '10',
            description: null,
          },
        ],
      }).success,
    ).toBe(false);
  });
});
