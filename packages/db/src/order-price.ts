export type PricedLineInput = {
  menuItemId: string;
  quantity: number;
  unitPriceAmount: number;
  name: string;
  isAvailable: boolean;
  isSoldOut: boolean;
};

export type PricedLine = {
  menuItemId: string;
  quantity: number;
  nameSnapshot: string;
  unitPriceAmount: number;
  lineTotalAmount: number;
};

export type PriceError =
  | { code: 'EMPTY_CART' }
  | { code: 'INVALID_QTY'; menuItemId: string }
  | { code: 'ITEM_UNAVAILABLE'; menuItemId: string }
  | { code: 'ITEM_SOLD_OUT'; menuItemId: string };

/**
 * 服务端按当前菜单价重算订单行；拒绝不可用/售罄/非法数量。
 */
export function priceOrderLines(
  lines: PricedLineInput[],
): { ok: true; lines: PricedLine[]; subtotalAmount: number } | { ok: false; error: PriceError } {
  if (lines.length === 0) {
    return { ok: false, error: { code: 'EMPTY_CART' } };
  }

  const priced: PricedLine[] = [];
  let subtotalAmount = 0;

  for (const line of lines) {
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99) {
      return { ok: false, error: { code: 'INVALID_QTY', menuItemId: line.menuItemId } };
    }
    if (!line.isAvailable) {
      return { ok: false, error: { code: 'ITEM_UNAVAILABLE', menuItemId: line.menuItemId } };
    }
    if (line.isSoldOut) {
      return { ok: false, error: { code: 'ITEM_SOLD_OUT', menuItemId: line.menuItemId } };
    }
    const lineTotalAmount = line.unitPriceAmount * line.quantity;
    priced.push({
      menuItemId: line.menuItemId,
      quantity: line.quantity,
      nameSnapshot: line.name,
      unitPriceAmount: line.unitPriceAmount,
      lineTotalAmount,
    });
    subtotalAmount += lineTotalAmount;
  }

  return { ok: true, lines: priced, subtotalAmount };
}
