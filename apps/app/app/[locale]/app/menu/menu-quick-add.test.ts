import { describe, expect, it } from 'vitest';
import { parseQuickAddLines, QUICK_ADD_MAX_LINES } from './menu-quick-add';

describe('parseQuickAddLines（issue #18）', () => {
  it('支持常见分隔符与货币符号', () => {
    const { items, errors } = parseQuickAddLines(
      [
        'Baguette - 1.20',
        'Croissant, 1.5',
        'Pain au chocolat: €1.80',
        'Café crème\t3',
        'Eau 0',
      ].join('\n'),
      'USD',
    );
    expect(errors).toEqual([]);
    expect(items.map((item) => [item.name, item.priceAmount])).toEqual([
      ['Baguette', 120],
      ['Croissant', 150],
      ['Pain au chocolat', 180],
      ['Café crème', 300],
      ['Eau', 0],
    ]);
  });

  it('VND 千分位、名称里带横线', () => {
    const { items } = parseQuickAddLines('Bánh mì - đặc biệt - 35.000đ\nPhở bò 45,000', 'VND');
    expect(items).toEqual([
      { line: 1, name: 'Bánh mì - đặc biệt', priceAmount: 35000 },
      { line: 2, name: 'Phở bò', priceAmount: 45000 },
    ]);
  });

  it('欧式小数逗号', () => {
    expect(parseQuickAddLines('Baguette 1,20', 'USD').items[0]?.priceAmount).toBe(120);
  });

  it('负数、缺价格、超长名称都报错，并保留原文与行号', () => {
    const { items, errors } = parseQuickAddLines(
      ['Baguette -3', 'Croissant - -1', 'Just a name', '', `${'a'.repeat(121)} - 3`].join('\n'),
      'USD',
    );
    expect(items).toEqual([]);
    expect(errors).toEqual([
      { line: 1, text: 'Baguette -3', reason: 'negative' },
      { line: 2, text: 'Croissant - -1', reason: 'negative' },
      { line: 3, text: 'Just a name', reason: 'format' },
      { line: 5, text: `${'a'.repeat(121)} - 3`, reason: 'nameTooLong' },
    ]);
  });

  it('超过单次上限的行标记为 tooMany', () => {
    const text = Array.from({ length: QUICK_ADD_MAX_LINES + 2 }, (_, i) => `Item ${i} - 1`).join(
      '\n',
    );
    const { items, errors } = parseQuickAddLines(text, 'USD');
    expect(items).toHaveLength(QUICK_ADD_MAX_LINES);
    expect(errors.map((error) => error.reason)).toEqual(['tooMany', 'tooMany']);
  });
});
