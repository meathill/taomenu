import { describe, expect, it } from 'vitest';
import type { CartLineSelection } from '../../../modifier-picker';
import { addToCart, type CartLine, cartSubtotal } from './customer-cart';

function selection(
  overrides: Partial<Omit<CartLineSelection, 'quantity'>> = {},
): Omit<CartLineSelection, 'quantity'> {
  return {
    menuItemId: 'item-1',
    name: 'Phở bò',
    priceAmount: 35000,
    modifierIds: [],
    lineKey: 'item-1-',
    ...overrides,
  };
}

describe('addToCart', () => {
  it('新菜品追加一行', () => {
    const next = addToCart([], selection());
    expect(next).toHaveLength(1);
    expect(next[0]?.quantity).toBe(1);
  });

  it('相同 lineKey 合并并累加数量', () => {
    const one = addToCart([], selection());
    const two = addToCart(one, selection());
    expect(two).toHaveLength(1);
    expect(two[0]?.quantity).toBe(2);
  });

  it('数量达到 99 后不再累加', () => {
    const full: CartLine = { ...selection(), quantity: 99 };
    const next = addToCart([full], selection());
    expect(next[0]?.quantity).toBe(99);
  });

  it('不同规格的同一菜品是不同行', () => {
    const a = addToCart([], selection({ lineKey: 'item-1-1', modifierIds: ['m1'] }));
    const b = addToCart(a, selection({ lineKey: 'item-1-2', modifierIds: ['m2'] }));
    expect(b).toHaveLength(2);
  });
});

describe('cartSubtotal', () => {
  it('按行金额乘以数量求和', () => {
    const cart: CartLine[] = [
      { ...selection(), priceAmount: 35000, quantity: 2 },
      {
        ...selection({ lineKey: 'item-2-', menuItemId: 'item-2', priceAmount: 10000 }),
        quantity: 3,
      },
    ];
    expect(cartSubtotal(cart)).toBe(100000);
  });

  it('空购物车金额为 0', () => {
    expect(cartSubtotal([])).toBe(0);
  });
});
