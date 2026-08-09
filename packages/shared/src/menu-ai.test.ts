import { describe, expect, it } from 'vitest';
import { menuImportOutputSchema, reviewMenuImportSchema } from './menu-ai';

describe('AI 菜单导入 schema', () => {
  it('接受带低置信度和空价格的可审核草稿', () => {
    const result = menuImportOutputSchema.safeParse({
      detectedLocale: 'vi',
      currency: 'VND',
      categories: [
        {
          name: 'Món chính',
          description: null,
          confidence: 0.98,
          items: [
            {
              name: 'Cơm gà',
              description: null,
              priceAmount: null,
              confidence: 0.62,
              modifierGroups: [],
            },
          ],
        },
      ],
      warnings: ['Không đọc rõ giá'],
    });
    expect(result.success).toBe(true);
  });

  it('拒绝越界价格和仍为 pending 的审核请求', () => {
    expect(
      menuImportOutputSchema.safeParse({
        detectedLocale: 'vi',
        currency: 'VND',
        categories: [
          {
            name: 'Món chính',
            description: null,
            confidence: 1,
            items: [
              {
                name: 'Cơm',
                description: null,
                priceAmount: 100_000_001,
                confidence: 1,
                modifierGroups: [],
              },
            ],
          },
        ],
        warnings: [],
      }).success,
    ).toBe(false);
    expect(
      reviewMenuImportSchema.safeParse({
        suggestions: [{ id: crypto.randomUUID(), decision: 'pending' }],
      }).success,
    ).toBe(false);
  });
});
