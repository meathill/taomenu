/** 规格选择与计价纯函数：服务端重算订单行时使用。 */

export type ModifierOptionInput = {
  id: string;
  groupId: string;
  name: string;
  priceDeltaAmount: number;
  isAvailable: boolean;
};

export type ModifierGroupInput = {
  id: string;
  name: string;
  minSelected: number;
  maxSelected: number;
  isRequired: boolean;
  options: ModifierOptionInput[];
};

export type ModifierSelectError =
  | { code: 'UNKNOWN_MODIFIER'; modifierId: string }
  | { code: 'MODIFIER_UNAVAILABLE'; modifierId: string }
  | { code: 'MODIFIER_WRONG_ITEM'; modifierId: string }
  | { code: 'GROUP_MIN'; groupId: string; min: number; selected: number }
  | { code: 'GROUP_MAX'; groupId: string; max: number; selected: number }
  | { code: 'DUPLICATE_MODIFIER'; modifierId: string };

export type ModifierSelectResult =
  | {
      ok: true;
      unitPriceAmount: number;
      nameSnapshot: string;
      selected: Array<{ id: string; name: string; priceDeltaAmount: number }>;
    }
  | { ok: false; error: ModifierSelectError };

/**
 * 校验顾客对某道菜的规格选择，并计算含加价的单价与名称快照。
 * baseName + basePrice 来自当前菜单；selectedIds 为选中的 modifier id 列表。
 */
export function resolveModifierSelection(input: {
  baseName: string;
  basePriceAmount: number;
  groups: ModifierGroupInput[];
  selectedIds: string[];
}): ModifierSelectResult {
  const { baseName, basePriceAmount, groups, selectedIds } = input;
  const uniqueIds = [...new Set(selectedIds)];
  if (uniqueIds.length !== selectedIds.length) {
    const seen = new Set<string>();
    for (const id of selectedIds) {
      if (seen.has(id)) {
        return { ok: false, error: { code: 'DUPLICATE_MODIFIER', modifierId: id } };
      }
      seen.add(id);
    }
  }

  const optionById = new Map<string, ModifierOptionInput>();
  for (const group of groups) {
    for (const option of group.options) {
      optionById.set(option.id, option);
    }
  }

  const selectedOptions: ModifierOptionInput[] = [];
  for (const id of uniqueIds) {
    const option = optionById.get(id);
    if (!option) {
      return { ok: false, error: { code: 'UNKNOWN_MODIFIER', modifierId: id } };
    }
    if (!option.isAvailable) {
      return { ok: false, error: { code: 'MODIFIER_UNAVAILABLE', modifierId: id } };
    }
    selectedOptions.push(option);
  }

  for (const group of groups) {
    const count = selectedOptions.filter((o) => o.groupId === group.id).length;
    const min = group.isRequired ? Math.max(group.minSelected, 1) : group.minSelected;
    const max = Math.max(group.maxSelected, min);
    if (count < min) {
      return {
        ok: false,
        error: { code: 'GROUP_MIN', groupId: group.id, min, selected: count },
      };
    }
    if (count > max) {
      return {
        ok: false,
        error: { code: 'GROUP_MAX', groupId: group.id, max, selected: count },
      };
    }
  }

  let unitPriceAmount = basePriceAmount;
  const nameParts: string[] = [];
  for (const option of selectedOptions) {
    unitPriceAmount += option.priceDeltaAmount;
    nameParts.push(option.name);
  }

  const nameSnapshot = nameParts.length > 0 ? `${baseName} (${nameParts.join(', ')})` : baseName;

  return {
    ok: true,
    unitPriceAmount,
    nameSnapshot,
    selected: selectedOptions.map((o) => ({
      id: o.id,
      name: o.name,
      priceDeltaAmount: o.priceDeltaAmount,
    })),
  };
}
