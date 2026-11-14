import { describe, expect, it } from 'vitest';
import { isUntranslatedMenuOutput, menuTranslationOutputSchema } from './menu-translation';

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

describe('isUntranslatedMenuOutput', () => {
  const sources = [
    { entityId: '1', name: 'Phở bò tái', description: null },
    { entityId: '2', name: 'Đồ uống', description: null },
    { entityId: '3', name: 'Cà phê sữa đá', description: null },
    { entityId: '4', name: 'Phở gà', description: null },
    { entityId: '5', name: 'Nước chanh', description: null },
  ];

  it('全部或几乎全部字段与原文相同则失败', () => {
    expect(
      isUntranslatedMenuOutput(
        sources,
        sources.map((source) => ({ ...source })),
      ),
    ).toBe(true);
    // 5 条里 4 条原样回写（80%）也视为失败
    expect(
      isUntranslatedMenuOutput(sources, [
        { entityId: '1', name: 'Phở bò tái (Rare beef noodle soup)', description: null },
        { entityId: '2', name: 'Đồ uống', description: null },
        { entityId: '3', name: 'Cà phê sữa đá', description: null },
        { entityId: '4', name: 'Phở gà', description: null },
        { entityId: '5', name: 'Nước chanh', description: null },
      ]),
    ).toBe(true);
  });

  it('大部分字段已译成目标语言则通过', () => {
    expect(
      isUntranslatedMenuOutput(sources, [
        { entityId: '1', name: 'Phở bò tái (Rare beef noodle soup)', description: null },
        { entityId: '2', name: 'Drinks', description: null },
        {
          entityId: '3',
          name: 'Cà phê sữa đá (Iced coffee with condensed milk)',
          description: null,
        },
        { entityId: '4', name: 'Phở gà (Chicken noodle soup)', description: null },
        { entityId: '5', name: 'Nước chanh (Lemonade)', description: null },
      ]),
    ).toBe(false);
  });

  it('源描述也被原样回写时计入失败比例', () => {
    expect(
      isUntranslatedMenuOutput(
        [{ entityId: '1', name: 'Phở', description: 'Nước dùng đậm đà' }],
        [{ entityId: '1', name: 'Phở', description: 'Nước dùng đậm đà' }],
      ),
    ).toBe(true);
  });
});
