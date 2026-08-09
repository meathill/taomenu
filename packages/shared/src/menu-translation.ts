import { z } from 'zod';

export const MENU_TRANSLATION_ENTITY_TYPES = [
  'category',
  'item',
  'modifier_group',
  'modifier',
] as const;
export type MenuTranslationEntityType = (typeof MENU_TRANSLATION_ENTITY_TYPES)[number];

export const menuTranslationInputEntitySchema = z.object({
  entityType: z.enum(MENU_TRANSLATION_ENTITY_TYPES),
  entityId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).nullable(),
});

export const menuTranslationOutputSchema = z.object({
  translations: z
    .array(
      z.object({
        entityType: z.enum(MENU_TRANSLATION_ENTITY_TYPES),
        entityId: z.string().uuid(),
        name: z.string().trim().min(1).max(120),
        description: z.string().trim().max(1000).nullable(),
      }),
    )
    .min(1)
    .max(400),
});

export type MenuTranslationInputEntity = z.infer<typeof menuTranslationInputEntitySchema>;
export type MenuTranslationOutput = z.infer<typeof menuTranslationOutputSchema>;

export const reviewMenuTranslationSchema = z.object({
  suggestions: z
    .array(
      z.object({
        id: z.string().uuid(),
        selected: z.boolean(),
        name: z.string().trim().min(1).max(120),
        description: z.string().trim().max(1000).nullable(),
      }),
    )
    .min(1)
    .max(400),
});
export type ReviewMenuTranslationBody = z.infer<typeof reviewMenuTranslationSchema>;

export const MENU_TRANSLATION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    translations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          entityType: { type: 'string', enum: MENU_TRANSLATION_ENTITY_TYPES },
          entityId: { type: 'string' },
          name: { type: 'string' },
          description: { type: ['string', 'null'] },
        },
        required: ['entityType', 'entityId', 'name', 'description'],
        additionalProperties: false,
      },
    },
  },
  required: ['translations'],
  additionalProperties: false,
} as const;
