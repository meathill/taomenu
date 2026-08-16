import { getCurrencyDecimals } from '@taomenu/shared';

export type ItemFormValues = {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  isAvailable: boolean;
  isSoldOut: boolean;
};

type ItemFormSource = {
  priceAmount: number;
  isAvailable: boolean;
  isSoldOut: boolean;
};

type ItemFormTranslation = {
  name?: string;
  description?: string | null;
};

export function amountToInput(amount: number, currency: string) {
  const decimals = getCurrencyDecimals(currency);
  return (amount / 10 ** decimals).toFixed(decimals).replace(/\.0+$/, '');
}

export function shouldHydrateItemForm(input: {
  open: boolean;
  wasOpen: boolean;
  itemId: string | null;
  previousItemId: string | null;
}) {
  return input.open && (!input.wasOpen || input.itemId !== input.previousItemId);
}

export function buildItemFormValues(input: {
  item: ItemFormSource | null;
  translation?: ItemFormTranslation | null;
  currency: string;
  initialCategoryId?: string;
  fallbackCategoryId?: string;
}): ItemFormValues {
  return {
    name: input.translation?.name ?? '',
    description: input.translation?.description ?? '',
    price: input.item ? amountToInput(input.item.priceAmount, input.currency) : '',
    categoryId: input.initialCategoryId ?? input.fallbackCategoryId ?? '',
    isAvailable: input.item?.isAvailable ?? true,
    isSoldOut: input.item?.isSoldOut ?? false,
  };
}

export function selectCreatedCategory<T extends { categoryId: string }>(
  draft: T,
  createdCategoryId: string,
): T {
  return { ...draft, categoryId: createdCategoryId };
}
