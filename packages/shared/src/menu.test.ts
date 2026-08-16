import { describe, expect, it } from 'vitest';
import {
  batchItemAvailabilitySchema,
  createItemSchema,
  createModifierGroupSchema,
  createModifierSchema,
  reorderModifierGroupsSchema,
  updateModifierGroupSchema,
} from './menu';

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

describe('modifier schemas', () => {
  it('接受必选规格组', () => {
    expect(
      createModifierGroupSchema.safeParse({
        name: 'Size',
        isRequired: true,
        minSelected: 1,
        maxSelected: 1,
      }).success,
    ).toBe(true);
  });

  it('接受加价选项', () => {
    expect(
      createModifierSchema.safeParse({
        name: 'L',
        priceDeltaAmount: 10000,
      }).success,
    ).toBe(true);
  });

  it('创建规格组时可一次带上选项', () => {
    expect(
      createModifierGroupSchema.safeParse({
        name: '辣度',
        isRequired: true,
        options: [{ name: '不辣' }, { name: '中辣', priceDeltaAmount: 5000 }],
      }).success,
    ).toBe(true);
  });

  it('更新规格组可同步选项并改排序', () => {
    expect(
      updateModifierGroupSchema.safeParse({
        name: '辣度',
        sortOrder: 1,
        options: [{ id: '00000000-0000-4000-8000-000000000001', name: '不辣' }],
      }).success,
    ).toBe(true);
  });

  it('重排必须是 uuid 列表', () => {
    expect(reorderModifierGroupsSchema.safeParse({ orderedIds: [] }).success).toBe(false);
    expect(
      reorderModifierGroupsSchema.safeParse({
        orderedIds: ['00000000-0000-4000-8000-000000000001'],
      }).success,
    ).toBe(true);
  });
});
