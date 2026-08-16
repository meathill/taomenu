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
  /** 最小单位整数（币种 0/2 位小数，见 currency.ts），最小 0 */
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

export const modifierOptionInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  /** 相对菜品基价的加价，最小单位整数；空/缺省视为 0 */
  priceDeltaAmount: z.number().int().min(0).max(100_000_000).optional(),
});

export const createModifierGroupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  isRequired: z.boolean().optional(),
  minSelected: z.number().int().min(0).max(20).optional(),
  maxSelected: z.number().int().min(1).max(20).optional(),
  locale: z.string().trim().min(2).max(16).optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  options: z.array(modifierOptionInputSchema).max(50).optional(),
});

export const updateModifierGroupSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  isRequired: z.boolean().optional(),
  minSelected: z.number().int().min(0).max(20).optional(),
  maxSelected: z.number().int().min(1).max(20).optional(),
  locale: z.string().trim().min(2).max(16).optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  options: z.array(modifierOptionInputSchema).max(50).optional(),
});

export const reorderModifierGroupsSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1).max(50),
});

export const createModifierSchema = z.object({
  name: z.string().trim().min(1).max(80),
  /** 相对菜品基价的加价，最小单位整数（币种 0/2 位小数，见 currency.ts）；MVP 只允许 0+ */
  priceDeltaAmount: z.number().int().min(0).max(100_000_000).optional(),
  locale: z.string().trim().min(2).max(16).optional(),
});

export const updateModifierSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  priceDeltaAmount: z.number().int().min(0).max(100_000_000).optional(),
  isAvailable: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  locale: z.string().trim().min(2).max(16).optional(),
});

export type CreateCategoryBody = z.infer<typeof createCategorySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategorySchema>;
export type CreateItemBody = z.infer<typeof createItemSchema>;
export type UpdateItemBody = z.infer<typeof updateItemSchema>;
export type BatchItemAvailabilityBody = z.infer<typeof batchItemAvailabilitySchema>;
export type ModifierOptionInput = z.infer<typeof modifierOptionInputSchema>;
export type CreateModifierGroupBody = z.infer<typeof createModifierGroupSchema>;
export type UpdateModifierGroupBody = z.infer<typeof updateModifierGroupSchema>;
export type ReorderModifierGroupsBody = z.infer<typeof reorderModifierGroupsSchema>;
export type CreateModifierBody = z.infer<typeof createModifierSchema>;
export type UpdateModifierBody = z.infer<typeof updateModifierSchema>;
