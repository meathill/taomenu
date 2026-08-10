import type { CartLineSelection } from '../../../modifier-picker';

export type CartLine = CartLineSelection;

/** 已有同 key 行则数量 +1（上限 99），否则追加新行。 */
export function addToCart(
  cart: CartLine[],
  selection: Omit<CartLineSelection, 'quantity'>,
): CartLine[] {
  const existing = cart.find((l) => l.lineKey === selection.lineKey);
  if (existing) {
    return cart.map((l) =>
      l.lineKey === selection.lineKey ? { ...l, quantity: Math.min(99, l.quantity + 1) } : l,
    );
  }
  return [...cart, { ...selection, quantity: 1 }];
}

export function cartSubtotal(cart: CartLine[]): number {
  return cart.reduce((sum, line) => sum + line.priceAmount * line.quantity, 0);
}
