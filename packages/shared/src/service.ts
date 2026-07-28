import { z } from 'zod';

export const createServiceRequestSchema = z.object({
  type: z.enum(['call_staff', 'request_bill']),
  idempotencyKey: z.string().trim().min(8).max(128),
});

export type CreateServiceRequestBody = z.infer<typeof createServiceRequestSchema>;

export const recordPaymentSchema = z.object({
  method: z.enum(['cash', 'bank_transfer', 'other']),
  amount: z.number().int().min(0).max(100_000_000).optional(),
  note: z.string().trim().max(200).optional(),
  orderId: z.string().uuid().optional(),
  tableSessionId: z.string().uuid().optional(),
});

export type RecordPaymentBody = z.infer<typeof recordPaymentSchema>;
