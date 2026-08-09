import { z } from 'zod';

export const MENU_IMPORT_STATUSES = [
  'draft',
  'queued',
  'processing',
  'needs_review',
  'applied',
  'failed',
  'cancelled',
] as const;
export type MenuImportStatus = (typeof MENU_IMPORT_STATUSES)[number];

export const MENU_IMPORT_DECISIONS = ['pending', 'accepted', 'edited', 'rejected'] as const;
export type MenuImportDecision = (typeof MENU_IMPORT_DECISIONS)[number];

const confidenceSchema = z.number().min(0).max(1);
const modifierSchema = z.object({
  name: z.string().trim().min(1).max(80),
  priceDeltaAmount: z.number().int().min(0).max(100_000_000),
  confidence: confidenceSchema,
});
const modifierGroupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  minSelected: z.number().int().min(0).max(20),
  maxSelected: z.number().int().min(1).max(20),
  isRequired: z.boolean(),
  confidence: confidenceSchema,
  modifiers: z.array(modifierSchema).max(50),
});
export const menuImportItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullable(),
  priceAmount: z.number().int().min(0).max(100_000_000).nullable(),
  confidence: confidenceSchema,
  modifierGroups: z.array(modifierGroupSchema).max(20),
});
export const menuImportCategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).nullable(),
  confidence: confidenceSchema,
  items: z.array(menuImportItemSchema).max(200),
});

export const menuImportOutputSchema = z
  .object({
    detectedLocale: z.string().trim().min(2).max(16),
    currency: z.string().trim().length(3),
    categories: z.array(menuImportCategorySchema).min(1).max(80),
    warnings: z.array(z.string().trim().min(1).max(300)).max(50),
  })
  .superRefine((output, context) => {
    let suggestionCount = 0;
    let nodeCount = 0;
    for (const category of output.categories) {
      suggestionCount += 1 + category.items.length;
      nodeCount += 1;
      for (const item of category.items) {
        nodeCount += 1 + item.modifierGroups.length;
        for (const group of item.modifierGroups) nodeCount += group.modifiers.length;
      }
    }
    if (suggestionCount > 250 || nodeCount > 400) {
      context.addIssue({
        code: 'custom',
        message: 'Menu import is too large; split it into smaller files',
      });
    }
  });
export type MenuImportOutput = z.infer<typeof menuImportOutputSchema>;
export type MenuImportCategory = z.infer<typeof menuImportCategorySchema>;
export type MenuImportItem = z.infer<typeof menuImportItemSchema>;

export const reviewMenuImportSchema = z.object({
  suggestions: z
    .array(
      z.object({
        id: z.string().uuid(),
        decision: z.enum(MENU_IMPORT_DECISIONS).exclude(['pending']),
        value: z.unknown().optional(),
      }),
    )
    .min(1)
    .max(300),
});
export type ReviewMenuImportBody = z.infer<typeof reviewMenuImportSchema>;

export const MENU_IMPORT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    detectedLocale: { type: 'string' },
    currency: { type: 'string' },
    categories: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: ['string', 'null'] },
          confidence: { type: 'number' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: ['string', 'null'] },
                priceAmount: { type: ['integer', 'null'] },
                confidence: { type: 'number' },
                modifierGroups: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      minSelected: { type: 'integer' },
                      maxSelected: { type: 'integer' },
                      isRequired: { type: 'boolean' },
                      confidence: { type: 'number' },
                      modifiers: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            priceDeltaAmount: { type: 'integer' },
                            confidence: { type: 'number' },
                          },
                          required: ['name', 'priceDeltaAmount', 'confidence'],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: [
                      'name',
                      'minSelected',
                      'maxSelected',
                      'isRequired',
                      'confidence',
                      'modifiers',
                    ],
                    additionalProperties: false,
                  },
                },
              },
              required: ['name', 'description', 'priceAmount', 'confidence', 'modifierGroups'],
              additionalProperties: false,
            },
          },
        },
        required: ['name', 'description', 'confidence', 'items'],
        additionalProperties: false,
      },
    },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['detectedLocale', 'currency', 'categories', 'warnings'],
  additionalProperties: false,
} as const;
