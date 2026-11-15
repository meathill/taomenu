import { describe, expect, it } from 'vitest';
import {
  addToCart,
  type CartLine,
  cartSubtotal,
  changeCartQuantity,
  normalizeOrderNote,
} from './customer-cart';
import type { CartLineSelection } from './modifier-picker';

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

  it('一次加入指定数量', () => {
    const next = addToCart([], selection(), 2);
    expect(next).toHaveLength(1);
    expect(next[0]?.quantity).toBe(2);
  });

  it('已有行再加入多份时累加，且不超过 99', () => {
    const one = addToCart([], selection(), 2);
    const two = addToCart(one, selection(), 3);
    expect(two[0]?.quantity).toBe(5);
    const full: CartLine = { ...selection(), quantity: 97 };
    expect(addToCart([full], selection(), 5)[0]?.quantity).toBe(99);
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

describe('changeCartQuantity（issue #22）', () => {
  const line: CartLine = { ...selection(), quantity: 2 };
  const other: CartLine = {
    ...selection({ lineKey: 'item-2-', menuItemId: 'item-2' }),
    quantity: 1,
  };

  it('+1 / -1 调整数量', () => {
    expect(changeCartQuantity([line], line.lineKey, 1)[0]?.quantity).toBe(3);
    expect(changeCartQuantity([line], line.lineKey, -1)[0]?.quantity).toBe(1);
  });

  it('减到 0 移除该行，不影响其他行', () => {
    const next = changeCartQuantity([other, line], other.lineKey, -1);
    expect(next).toEqual([line]);
  });

  it('数量上限 99', () => {
    expect(changeCartQuantity([{ ...line, quantity: 99 }], line.lineKey, 1)[0]?.quantity).toBe(99);
  });
});

describe('normalizeOrderNote', () => {
  it('空白备注不提交，其余去掉首尾空白', () => {
    expect(normalizeOrderNote('   ')).toBeUndefined();
    expect(normalizeOrderNote(' 不要香菜 ')).toBe('不要香菜');
  });

  it('超长截到 500 字', () => {
    expect(normalizeOrderNote('a'.repeat(600))?.length).toBe(500);
  });
});
