'use client';

import { PencilSimpleIcon, PlusIcon } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/button';
import { MenuItemRow } from './menu-item-row';
import { localizedName, type MenuCategory } from './menu-types';

type MenuCategoryCardProps = {
  category: MenuCategory;
  activeLocale: string;
  baseLocale: string;
  currency: string;
  busyAction: string | null;
  selectMode: boolean;
  selectedIds: Set<string>;
  onAddItem: (categoryId: string) => void;
  onEditCategory: (categoryId: string) => void;
  onEditItem: (itemId: string) => void;
  onToggleSelect: (itemId: string) => void;
  onCopy: (itemId: string) => void;
  onDelete: (itemId: string, name: string) => void;
  onToggleSoldOut: (itemId: string, isSoldOut: boolean) => void;
};

export function MenuCategoryCard({
  category,
  activeLocale,
  baseLocale,
  currency,
  busyAction,
  selectMode,
  selectedIds,
  onAddItem,
  onEditCategory,
  onEditItem,
  onToggleSelect,
  onCopy,
  onDelete,
  onToggleSoldOut,
}: MenuCategoryCardProps) {
  const t = useTranslations('menu');
  const categoryName = localizedName(category.translations, activeLocale, baseLocale);
  const isBaseMode = activeLocale === baseLocale;

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-ink-900">{categoryName.label}</h2>
          {categoryName.isMissing ? (
            <span className="text-xs font-semibold text-terracotta-600">
              {t('needsTranslation')}
            </span>
          ) : null}
        </div>
        {!selectMode ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onEditCategory(category.id)}
              className="text-jade-700"
            >
              <PencilSimpleIcon className="size-4" weight="bold" aria-hidden />
              {t('edit')}
            </Button>
            {isBaseMode ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onAddItem(category.id)}
                className="text-jade-700"
              >
                <PlusIcon className="size-4" weight="bold" aria-hidden />
                {t('addItem')}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <ul className="divide-y divide-border px-4">
        {category.items.map((item) => {
          const itemName = localizedName(item.translations, activeLocale, baseLocale);
          return (
            <li key={item.id}>
              <MenuItemRow
                item={item}
                currency={currency}
                label={itemName.label}
                isMissingTranslation={itemName.isMissing}
                busyAction={busyAction}
                selectMode={selectMode}
                selected={selectedIds.has(item.id)}
                onToggleSelect={() => onToggleSelect(item.id)}
                onEdit={() => onEditItem(item.id)}
                onCopy={() => onCopy(item.id)}
                onDelete={() => onDelete(item.id, itemName.label)}
                onToggleSoldOut={() => onToggleSoldOut(item.id, item.isSoldOut)}
              />
            </li>
          );
        })}
        {category.items.length === 0 ? (
          <li className="py-4 text-sm text-muted-foreground">{t('emptyItems')}</li>
        ) : null}
      </ul>
    </li>
  );
}
