import type {
  MenuImportOutput,
  MenuTranslationInputEntity,
  MenuTranslationOutput,
} from '@taomenu/shared';

type Translator = (input: {
  sourceLocale: string;
  targetLocale: string;
  entities: MenuTranslationInputEntity[];
}) => Promise<{ output: MenuTranslationOutput; usage: unknown }>;

/** 名称长度上限与 menuImportOutputSchema 保持一致，模型译文偶尔偏长 */
const NAME_MAX = { category: 80, item: 120, modifier_group: 80, modifier: 80 } as const;

/**
 * 识别语言与已有菜单语言不同时（issue #29），把整份识别结果翻译成菜单语言。
 * 结构（分类/菜品/规格的顺序与数量）保持不变，原文由调用方另行保存；
 * 漏翻的条目保留原文，不让整次导入失败。
 */
export async function translateImportOutput(
  translate: Translator,
  output: MenuImportOutput,
  targetLocale: string,
): Promise<{ output: MenuImportOutput; usage: unknown }> {
  const entities: MenuTranslationInputEntity[] = [];
  function track(
    entityType: MenuTranslationInputEntity['entityType'],
    name: string,
    description: string | null,
  ): string {
    const entityId = crypto.randomUUID();
    entities.push({ entityType, entityId, name, description });
    return entityId;
  }
  const ids = output.categories.map((category) => ({
    id: track('category', category.name, category.description),
    items: category.items.map((item) => ({
      id: track('item', item.name, item.description),
      groups: item.modifierGroups.map((group) => ({
        id: track('modifier_group', group.name, null),
        modifiers: group.modifiers.map((modifier) => track('modifier', modifier.name, null)),
      })),
    })),
  }));

  const result = await translate({ sourceLocale: output.detectedLocale, targetLocale, entities });
  const byId = new Map(result.output.translations.map((entry) => [entry.entityId, entry]));
  function nameOf(id: string, fallback: string, max: number): string {
    const name = byId.get(id)?.name.trim();
    return (name || fallback).slice(0, max);
  }
  function descriptionOf(id: string, fallback: string | null): string | null {
    const entry = byId.get(id);
    if (!entry || fallback === null) return fallback;
    return entry.description?.trim() || fallback;
  }

  return {
    usage: result.usage,
    output: {
      ...output,
      detectedLocale: targetLocale,
      categories: output.categories.map((category, categoryIndex) => {
        const categoryIds = ids[categoryIndex]!;
        return {
          ...category,
          name: nameOf(categoryIds.id, category.name, NAME_MAX.category),
          description: descriptionOf(categoryIds.id, category.description),
          items: category.items.map((item, itemIndex) => {
            const itemIds = categoryIds.items[itemIndex]!;
            return {
              ...item,
              name: nameOf(itemIds.id, item.name, NAME_MAX.item),
              description: descriptionOf(itemIds.id, item.description),
              modifierGroups: item.modifierGroups.map((group, groupIndex) => {
                const groupIds = itemIds.groups[groupIndex]!;
                return {
                  ...group,
                  name: nameOf(groupIds.id, group.name, NAME_MAX.modifier_group),
                  modifiers: group.modifiers.map((modifier, modifierIndex) => ({
                    ...modifier,
                    name: nameOf(
                      groupIds.modifiers[modifierIndex]!,
                      modifier.name,
                      NAME_MAX.modifier,
                    ),
                  })),
                };
              }),
            };
          }),
        };
      }),
    },
  };
}
