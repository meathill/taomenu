import { describe, expect, it } from 'vitest';
import { createItemSchema, formatVnd } from './menu';

describe('formatVnd', () => {
  it('格式化整数越南盾', () => {
    expect(formatVnd(149000)).toBe('149.000 ₫');
    expect(formatVnd(0)).toBe('0 ₫');
  });
});

describe('createItemSchema', () => {
  it('拒绝小数价格', () => {
    expect(
      createItemSchema.safeParse({
        categoryId: '00000000-0000-4000-8000-000000000001',
        name: 'Phở',
        priceAmount: 12.5,
      }).success,
    ).toBe(false);
  });

  it('接受整数价格', () => {
    expect(
      createItemSchema.safeParse({
        categoryId: '00000000-0000-4000-8000-000000000001',
        name: 'Phở',
        priceAmount: 45000,
      }).success,
    ).toBe(true);
  });
});
