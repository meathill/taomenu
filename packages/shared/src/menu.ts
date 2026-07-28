import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  locale: z.string().trim().min(2).max(16).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  locale: z.string().trim().min(2).max(16).optional(),
});

export const createItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  /** 整数 VND，最小 0 */
  priceAmount: z.number().int().min(0).max(100_000_000),
  locale: z.string().trim().min(2).max(16).optional(),
});

export const updateItemSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  priceAmount: z.number().int().min(0).max(100_000_000).optional(),
  isAvailable: z.boolean().optional(),
  isSoldOut: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  categoryId: z.string().uuid().optional(),
  locale: z.string().trim().min(2).max(16).optional(),
});

export const batchItemAvailabilitySchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(100),
  isAvailable: z.boolean().optional(),
  isSoldOut: z.boolean().optional(),
});

export type CreateCategoryBody = z.infer<typeof createCategorySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>;
export type CreateItemBody = z.infer<typeof createItemSchema>;
export type UpdateItemBody = z.infer<typeof updateItemSchema>;
export type BatchItemAvailabilityBody = z.infer<typeof batchItemAvailabilitySchema>;

/** 展示用 VND：149000 → "149.000 ₫" */
export function formatVnd(amount: number, locale = 'vi-VN'): string {
  return `${new Intl.NumberFormat(locale).format(amount)} ₫`;
}
