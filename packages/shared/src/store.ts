import { z } from 'zod';
import { BILLING_CURRENCIES } from './currency';
import { isValidTimeZone } from './timezone';

const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(isValidTimeZone, 'Invalid time zone');

export const SERVICE_MODES = ['table_service', 'counter_pickup', 'hybrid'] as const;

export const createStoreSchema = z.object({
  name: z.string().trim().min(1).max(80),
  serviceMode: z.enum(SERVICE_MODES),
  timezone: timezoneSchema.optional(),
  baseLocale: z.string().trim().min(2).max(16).optional(),
  currency: z.enum(BILLING_CURRENCIES).optional(),
});

export type CreateStoreBody = z.infer<typeof createStoreSchema>;

export const updateStoreSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  serviceMode: z.enum(SERVICE_MODES).optional(),
  timezone: timezoneSchema.optional(),
  acceptingPublicRequests: z.boolean().optional(),
  currency: z.enum(BILLING_CURRENCIES).optional(),
});

export type UpdateStoreBody = z.infer<typeof updateStoreSchema>;
