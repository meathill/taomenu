import type { MenuImportOutput } from '@taomenu/shared';
import { describe, expect, it, vi } from 'vitest';
import { translateImportOutput } from './import-translation';

const FRENCH: MenuImportOutput = {
  detectedLocale: 'fr',
  currency: 'EUR',
  warnings: [],
  categories: [
    {
      name: 'Viennoiseries',
      description: null,
      confidence: 0.9,
      items: [
        {
          name: 'Croissant',
          description: 'Pur beurre',
          priceAmount: 120,
          confidence: 0.95,
          modifierGroups: [
            {
              name: 'Taille',
              minSelected: 1,
              maxSelected: 1,
              isRequired: true,
              confidence: 0.9,
              modifiers: [{ name: 'Grand', priceDeltaAmount: 50, confidence: 0.9 }],
            },
          ],
        },
        {
          name: 'Pain au chocolat',
          description: null,
          priceAmount: 140,
          confidence: 0.9,
          modifierGroups: [],
        },
      ],
    },
  ],
};

const ENGLISH: Record<string, string> = {
  Viennoiseries: 'Pastries',
  Croissant: 'Croissant',
  'Pur beurre': 'All butter',
  Taille: 'Size',
  Grand: 'Large',
};

describe('translateImportOutput（issue #29）', () => {
  it('把识别结果翻译成菜单语言，结构与价格不变，漏翻条目保留原文', async () => {
    const translate = vi.fn(
      async (input: Parameters<Parameters<typeof translateImportOutput>[0]>[0]) => {
        expect(input).toMatchObject({ sourceLocale: 'fr', targetLocale: 'en' });
        expect(input.entities.map((entity) => entity.entityType)).toEqual([
          'category',
          'item',
          'modifier_group',
          'modifier',
          'item',
        ]);
        return {
          usage: { total_tokens: 5 },
          output: {
            translations: input.entities
              .filter((entity) => ENGLISH[entity.name])
              .map((entity) => ({
                entityType: entity.entityType,
                entityId: entity.entityId,
                name: ENGLISH[entity.name]!,
                description: entity.description ? (ENGLISH[entity.description] ?? null) : null,
              })),
          },
        };
      },
    );

    const result = await translateImportOutput(translate, FRENCH, 'en');
    const category = result.output.categories[0]!;
    expect(result.output.detectedLocale).toBe('en');
    expect(category.name).toBe('Pastries');
    expect(category.items[0]).toMatchObject({
      name: 'Croissant',
      description: 'All butter',
      priceAmount: 120,
    });
    expect(category.items[0]?.modifierGroups[0]).toMatchObject({
      name: 'Size',
      modifiers: [{ name: 'Large', priceDeltaAmount: 50 }],
    });
    // 模型漏翻：保留原文，不让导入失败
    expect(category.items[1]?.name).toBe('Pain au chocolat');
    expect(result.usage).toEqual({ total_tokens: 5 });
    expect(translate).toHaveBeenCalledOnce();
  });
});
