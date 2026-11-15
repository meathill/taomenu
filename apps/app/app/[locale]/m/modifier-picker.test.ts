import { describe, expect, it } from 'vitest';
import {
  cartLineKey,
  itemHasRequiredOptions,
  type PublicMenuItem,
  type PublicModifierGroup,
} from './modifier-picker';

function item(
  overrides: Partial<PublicMenuItem> = {},
  groups: PublicModifierGroup[] = [],
): PublicMenuItem {
  return {
    id: 'item-1',
    name: 'Phở bò',
    priceAmount: 50000,
    isSoldOut: false,
    modifierGroups: groups,
    ...overrides,
  };
}

function group(overrides: Partial<PublicModifierGroup> = {}): PublicModifierGroup {
  return {
    id: 'g1',
    name: 'Size',
    minSelected: 0,
    maxSelected: 1,
    isRequired: false,
    options: [{ id: 'o1', name: 'Lớn', priceDeltaAmount: 5000 }],
    ...overrides,
  };
}

describe('itemHasRequiredOptions', () => {
  it('没有规格或只有可选规格时可以直接加入', () => {
    expect(itemHasRequiredOptions(item())).toBe(false);
    expect(itemHasRequiredOptions(item({}, [group()]))).toBe(false);
  });

  it('必选规格（开关或最少 1 项）时必须打开详情', () => {
    expect(itemHasRequiredOptions(item({}, [group({ isRequired: true })]))).toBe(true);
    expect(itemHasRequiredOptions(item({}, [group({ minSelected: 1 })]))).toBe(true);
  });
});

describe('cartLineKey', () => {
  it('规格 id 排序后组成稳定 key', () => {
    expect(cartLineKey('item-1', ['b', 'a'])).toBe('item-1:a,b');
    expect(cartLineKey('item-1', [])).toBe('item-1:');
  });
});
