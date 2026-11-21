export type PublicModifierOption = {
  id: string;
  name: string;
  priceDeltaAmount: number;
};

export type PublicModifierGroup = {
  id: string;
  name: string;
  minSelected: number;
  maxSelected: number;
  isRequired: boolean;
  options: PublicModifierOption[];
};

export type PublicMenuItem = {
  id: string;
  name: string;
  description?: string | null;
  priceAmount: number | null;
  isSoldOut: boolean;
  imageKey?: string | null;
  modifierGroups: PublicModifierGroup[];
};

export type CartLineSelection = {
  menuItemId: string;
  name: string;
  priceAmount: number | null;
  quantity: number;
  modifierIds: string[];
  lineKey: string;
};

export function cartLineKey(menuItemId: string, modifierIds: string[]): string {
  const sorted = [...modifierIds].sort();
  return `${menuItemId}:${sorted.join(',')}`;
}

/** “+” 快捷加入：有必选规格时不能直接加入，需打开详情 */
export function itemHasRequiredOptions(item: PublicMenuItem): boolean {
  return (item.modifierGroups ?? []).some((group) => group.isRequired || group.minSelected > 0);
}
