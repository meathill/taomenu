import { describe, expect, it } from 'vitest';
import { createReviewDraft, type Suggestion } from './menu-import-review';

function makeSuggestion(overrides: Partial<Suggestion>): Suggestion {
  return {
    id: 'suggestion-1',
    entityType: 'item',
    temporaryEntityKey: 'item-1',
    locale: 'vi',
    confidence: 0.9,
    decision: 'pending',
    value: {
      categoryTemporaryKey: 'category-1',
      name: 'Phở bò',
      description: null,
      priceAmount: 65_000,
      modifierGroups: [],
    },
    ...overrides,
  };
}

describe('AI 菜单导入审核草稿', () => {
  it('预选有明确价格且未拒绝的建议', () => {
    const draft = createReviewDraft([makeSuggestion({})]);
    expect(draft['suggestion-1']).toMatchObject({
      selected: true,
      name: 'Phở bò',
      priceAmount: '65000',
    });
  });

  it('不预选缺少价格或已经拒绝的建议', () => {
    const draft = createReviewDraft([
      makeSuggestion({
        id: 'missing-price',
        value: { name: '时价鱼', description: null, priceAmount: null },
      }),
      makeSuggestion({ id: 'rejected', decision: 'rejected' }),
    ]);
    expect(draft['missing-price']?.selected).toBe(false);
    expect(draft.rejected?.selected).toBe(false);
  });
});
