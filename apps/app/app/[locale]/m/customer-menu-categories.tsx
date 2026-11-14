'use client';

import { CustomerMenuItemCard } from './customer-menu-item-card';
import type { PublicMenuItem } from './modifier-picker';

type MenuCategoryView = {
  id: string;
  name: string;
  items: PublicMenuItem[];
};

type CustomerMenuCategoriesProps = {
  categories: MenuCategoryView[];
  currency: string;
  acceptingPublicRequests: boolean;
  onPickItem: (item: PublicMenuItem) => void;
};

/** 分类标题与菜品列表：分类之间留白更清楚，无图时不加占位框 */
export function CustomerMenuCategories({
  categories,
  currency,
  acceptingPublicRequests,
  onPickItem,
}: CustomerMenuCategoriesProps) {
  return (
    <ul className="space-y-8 px-4 py-5">
      {categories.map((category) => (
        <li key={category.id}>
          <h2 className="mb-3 border-b border-border pb-2 text-lg font-extrabold tracking-tight text-terracotta-600">
            {category.name}
          </h2>
          <ul className="space-y-3">
            {category.items.map((item) => (
              <li key={item.id}>
                <CustomerMenuItemCard
                  item={item}
                  currency={currency}
                  disabled={item.isSoldOut || !acceptingPublicRequests}
                  onPick={() => onPickItem(item)}
                />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
