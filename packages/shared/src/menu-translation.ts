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

/** 未真正翻译的字段占比达到该阈值时，整份结果视为失败 */
export const UNTRANSLATED_OUTPUT_RATIO = 0.8;

export function normalizeComparableTranslationText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

type ComparableTranslationField = {
  entityId: string;
  name: string;
  description: string | null;
};

/**
 * 模型把源语言原文几乎原样写回时视为失败。
 * 比较名称，以及源文有内容的描述；空白差异忽略。
 */
export function isUntranslatedMenuOutput(
  sources: ComparableTranslationField[],
  translations: ComparableTranslationField[],
): boolean {
  const sourceById = new Map(sources.map((source) => [source.entityId, source]));
  let compared = 0;
  let identical = 0;
  for (const translation of translations) {
    const source = sourceById.get(translation.entityId);
    if (!source) continue;
    compared += 1;
    if (
      normalizeComparableTranslationText(translation.name) ===
      normalizeComparableTranslationText(source.name)
    ) {
      identical += 1;
    }
    if (source.description != null && source.description.trim() !== '') {
      compared += 1;
      if (
        normalizeComparableTranslationText(translation.description ?? '') ===
        normalizeComparableTranslationText(source.description)
      ) {
        identical += 1;
      }
    }
  }
  if (compared === 0) return true;
  return identical / compared >= UNTRANSLATED_OUTPUT_RATIO;
}
