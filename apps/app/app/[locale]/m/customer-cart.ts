import type { CartLineSelection } from './modifier-picker';

export type CartLine = CartLineSelection;

/** 已有同 key 行则累加数量（上限 99），否则按给定数量追加新行。 */
export function addToCart(
  cart: CartLine[],
  selection: Omit<CartLineSelection, 'quantity'>,
  quantity = 1,
): CartLine[] {
  const increment = Math.min(99, Math.max(1, Math.floor(quantity)));
  const existing = cart.find((l) => l.lineKey === selection.lineKey);
  if (existing) {
    return cart.map((l) =>
      l.lineKey === selection.lineKey
        ? { ...l, quantity: Math.min(99, l.quantity + increment) }
        : l,
    );
  }
  return [...cart, { ...selection, quantity: increment }];
}

export function cartSubtotal(cart: CartLine[]): number {
  return cart.reduce((sum, line) => sum + line.priceAmount * line.quantity, 0);
}

/** 购物车行数量 ±delta（上限 99）；减到 0 时移除该行。 */
export function changeCartQuantity(cart: CartLine[], lineKey: string, delta: number): CartLine[] {
  return cart.flatMap((line) => {
    if (line.lineKey !== lineKey) return [line];
    const quantity = Math.min(99, line.quantity + delta);
    return quantity > 0 ? [{ ...line, quantity }] : [];
  });
}

/** 下单备注上限与 createOrderSchema 保持一致 */
export const ORDER_NOTE_MAX_LENGTH = 500;

/** 空白备注不提交 */
export function normalizeOrderNote(note: string): string | undefined {
  const trimmed = note.trim();
  return trimmed ? trimmed.slice(0, ORDER_NOTE_MAX_LENGTH) : undefined;
}
