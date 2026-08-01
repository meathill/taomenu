import { describe, expect, it } from 'vitest';
import { type ModifierGroupInput, resolveModifierSelection } from './modifier-select';

const sizeGroup: ModifierGroupInput = {
  id: 'g-size',
  name: 'Size',
  minSelected: 1,
  maxSelected: 1,
  isRequired: true,
  options: [
    {
      id: 'm-s',
      groupId: 'g-size',
      name: 'S',
      priceDeltaAmount: 0,
      isAvailable: true,
    },
    {
      id: 'm-l',
      groupId: 'g-size',
      name: 'L',
      priceDeltaAmount: 10000,
      isAvailable: true,
    },
  ],
};

const toppingGroup: ModifierGroupInput = {
  id: 'g-top',
  name: 'Topping',
  minSelected: 0,
  maxSelected: 2,
  isRequired: false,
  options: [
    {
      id: 'm-egg',
      groupId: 'g-top',
      name: 'Trứng',
      priceDeltaAmount: 5000,
      isAvailable: true,
    },
    {
      id: 'm-meat',
      groupId: 'g-top',
      name: 'Thịt thêm',
      priceDeltaAmount: 15000,
      isAvailable: false,
    },
  ],
};

describe('resolveModifierSelection', () => {
  it('必选组未选时报 GROUP_MIN', () => {
    const result = resolveModifierSelection({
      baseName: 'Phở',
      basePriceAmount: 45000,
      groups: [sizeGroup],
      selectedIds: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('GROUP_MIN');
  });

  it('计算加价与名称快照', () => {
    const result = resolveModifierSelection({
      baseName: 'Phở',
      basePriceAmount: 45000,
      groups: [sizeGroup, toppingGroup],
      selectedIds: ['m-l', 'm-egg'],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.unitPriceAmount).toBe(60000);
      expect(result.nameSnapshot).toBe('Phở (L, Trứng)');
    }
  });

  it('拒绝不可用规格', () => {
    const result = resolveModifierSelection({
      baseName: 'Phở',
      basePriceAmount: 45000,
      groups: [sizeGroup, toppingGroup],
      selectedIds: ['m-s', 'm-meat'],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MODIFIER_UNAVAILABLE');
  });

  it('超过 maxSelected 报 GROUP_MAX', () => {
    const multiOnly: ModifierGroupInput = {
      ...sizeGroup,
      minSelected: 0,
      maxSelected: 1,
      isRequired: false,
      options: sizeGroup.options,
    };
    const result = resolveModifierSelection({
      baseName: 'Phở',
      basePriceAmount: 45000,
      groups: [multiOnly],
      selectedIds: ['m-s', 'm-l'],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('GROUP_MAX');
  });
});
