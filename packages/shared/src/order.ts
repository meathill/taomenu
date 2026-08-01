import { z } from 'zod';

export const createOrderSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(128),
  locale: z.string().trim().min(2).max(16).optional(),
  note: z.string().trim().max(500).optional(),
  lines: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
        /** 选中的规格 option id */
        modifierIds: z.array(z.string().uuid()).max(40).optional(),
      }),
    )
    .min(1)
    .max(50),
});

export type CreateOrderBody = z.infer<typeof createOrderSchema>;

export const createTableSchema = z.object({
  name: z.string().trim().min(1).max(40),
});

export const createPickupPointSchema = z.object({
  name: z.string().trim().min(1).max(40),
});
