import { describe, expect, it } from 'vitest';
import { createOrderSchema } from './order';

describe('createOrderSchema', () => {
  it('要求 idempotencyKey 与至少一行', () => {
    expect(
      createOrderSchema.safeParse({
        idempotencyKey: 'short',
        lines: [],
      }).success,
    ).toBe(false);

    expect(
      createOrderSchema.safeParse({
        idempotencyKey: 'idempotency-key-1',
        lines: [{ menuItemId: '00000000-0000-4000-8000-000000000001', quantity: 1 }],
      }).success,
    ).toBe(true);
  });
});
