import { describe, expect, it } from 'vitest';
import { priceOrderLines } from './order-price';

const base = {
  menuItemId: 'item-1',
  quantity: 2,
  unitPriceAmount: 45000,
  name: 'Phở',
  isAvailable: true,
  isSoldOut: false,
};

describe('priceOrderLines', () => {
  it('重算小计', () => {
    const result = priceOrderLines([base]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.subtotalAmount).toBe(90000);
      expect(result.lines[0]?.lineTotalAmount).toBe(90000);
    }
  });

  it('拒绝售罄', () => {
    const result = priceOrderLines([{ ...base, isSoldOut: true }]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ITEM_SOLD_OUT');
  });

  it('拒绝空车', () => {
    const result = priceOrderLines([]);
    expect(result.ok).toBe(false);
  });
});
