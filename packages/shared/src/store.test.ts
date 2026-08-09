import { describe, expect, it } from 'vitest';
import { BILLING_CURRENCIES } from './currency';
import { createStoreSchema, updateStoreSchema } from './store';

describe('createStoreSchema', () => {
  it('接受合法门店创建', () => {
    const result = createStoreSchema.safeParse({
      name: 'Phở 24',
      serviceMode: 'counter_pickup',
    });
    expect(result.success).toBe(true);
  });

  it('拒绝空店名与非法模式', () => {
    expect(createStoreSchema.safeParse({ name: '  ', serviceMode: 'table_service' }).success).toBe(
      false,
    );
    expect(createStoreSchema.safeParse({ name: 'A', serviceMode: 'delivery' }).success).toBe(false);
  });

  it('接受四种计费币种', () => {
    for (const currency of BILLING_CURRENCIES) {
      const result = createStoreSchema.safeParse({
        name: 'Phở 24',
        serviceMode: 'table_service',
        currency,
      });
      expect(result.success, currency).toBe(true);
    }
  });

  it('拒绝未支持币种与小写写法', () => {
    const base = { name: 'Phở 24', serviceMode: 'table_service' };
    expect(createStoreSchema.safeParse({ ...base, currency: 'EUR' }).success).toBe(false);
    expect(createStoreSchema.safeParse({ ...base, currency: 'usd' }).success).toBe(false);
  });
});

describe('updateStoreSchema', () => {
  it('接受四种计费币种', () => {
    for (const currency of BILLING_CURRENCIES) {
      expect(updateStoreSchema.safeParse({ currency }).success, currency).toBe(true);
    }
  });

  it('拒绝未支持币种与小写写法', () => {
    expect(updateStoreSchema.safeParse({ currency: 'EUR' }).success).toBe(false);
    expect(updateStoreSchema.safeParse({ currency: 'usd' }).success).toBe(false);
  });
});
