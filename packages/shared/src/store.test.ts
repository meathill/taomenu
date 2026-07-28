import { describe, expect, it } from 'vitest';
import { createStoreSchema } from './store';

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
});
