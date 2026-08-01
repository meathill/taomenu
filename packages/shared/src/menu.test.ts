import { describe, expect, it } from 'vitest';
import { batchItemAvailabilitySchema, createItemSchema, formatVnd } from './menu';

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

describe('batchItemAvailabilitySchema', () => {
  it('接受批量售罄', () => {
    expect(
      batchItemAvailabilitySchema.safeParse({
        itemIds: ['00000000-0000-4000-8000-000000000001'],
        isSoldOut: true,
      }).success,
    ).toBe(true);
  });

  it('拒绝空 itemIds', () => {
    expect(
      batchItemAvailabilitySchema.safeParse({
        itemIds: [],
        isAvailable: false,
      }).success,
    ).toBe(false);
  });
});
