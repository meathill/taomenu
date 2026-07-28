import { z } from 'zod';

export const SERVICE_MODES = ['table_service', 'counter_pickup', 'hybrid'] as const;

export const createStoreSchema = z.object({
  name: z.string().trim().min(1).max(80),
  serviceMode: z.enum(SERVICE_MODES),
  timezone: z.string().trim().min(1).max(64).optional(),
  baseLocale: z.string().trim().min(2).max(16).optional(),
});

export type CreateStoreBody = z.infer<typeof createStoreSchema>;

export const updateStoreSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  serviceMode: z.enum(SERVICE_MODES).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  acceptingPublicRequests: z.boolean().optional(),
});

export type UpdateStoreBody = z.infer<typeof updateStoreSchema>;
