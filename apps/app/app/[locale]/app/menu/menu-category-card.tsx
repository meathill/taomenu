'use client';

import { useTranslations } from 'next-intl';
import type { FormEvent } from 'react';
import { MenuItemDraftForm } from './menu-item-draft-form';
import { MenuItemImage } from './menu-item-image';
import { MenuItemRow } from './menu-item-row';
import { MenuModifiersPanel, type ModifierGroupView } from './menu-modifiers-panel';

type CategoryView = {
  id: string;
  isAvailable: boolean;
  translations: Array<{ locale: string; name: string }>;
  items: Array<{
    id: string;
    priceAmount: number;
    isAvailable: boolean;
    isSoldOut: boolean;
    imageKey: string | null;
    translations: Array<{ locale: string; name: string }>;
    modifierGroups: ModifierGroupView[];
  }>;
};

type ItemDraft = {
  categoryId: string;
  name: string;
  price: string;
};

type MenuCategoryCardProps = {
  category: CategoryView;
  baseLocale: string;
  currency: string;
  storeId: string;
  canUseImageEnhancement: boolean;
  canUseVoiceAssistant: boolean;
  busyAction: string | null;
  selectMode: boolean;
  selectedIds: Set<string>;
  itemDraft: ItemDraft | null;
  modifiersItemId: string | null;
  onAddItem: (categoryId: string) => void;
  onToggleSelect: (itemId: string) => void;
  onCopy: (itemId: string) => void;
  onDelete: (itemId: string, name: string) => void;
  onToggleSoldOut: (itemId: string, isSoldOut: boolean) => void;
  onEditModifiers: (itemId: string) => void;
  onBusyAction: (action: string | null) => void;
  onError: (message: string | null) => void;
  onMessage: (message: string | null) => void;
  onChangeItemDraft: (draft: ItemDraft | null) => void;
  onSubmitItem: (event: FormEvent) => void;
  onCloseModifiers: () => void;
  onChanged: () => Promise<void>;
};

function labelForCategory(category: CategoryView, baseLocale: string): string {
  return (
    category.translations.find((t) => t.locale === baseLocale)?.name ||
    category.translations[0]?.name ||
    '—'
  );
}

function labelForItem(item: CategoryView['items'][number], baseLocale: string) {
  return (
    item.translations.find((t) => t.locale === baseLocale)?.name ||
    item.translations[0]?.name ||
    '—'
  );
}

export function MenuCategoryCard({
  category,
  baseLocale,
  currency,
  storeId,
  canUseImageEnhancement,
  canUseVoiceAssistant,
  busyAction,
  selectMode,
  selectedIds,
  itemDraft,
  modifiersItemId,
  onAddItem,
  onToggleSelect,
  onCopy,
  onDelete,
  onToggleSoldOut,
  onEditModifiers,
  onBusyAction,
  onError,
  onMessage,
  onChangeItemDraft,
  onSubmitItem,
  onCloseModifiers,
  onChanged,
}: MenuCategoryCardProps) {
  const t = useTranslations('menu');

  return (
    <li className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-ink-900">{labelForCategory(category, baseLocale)}</h2>
        {!selectMode ? (
          <button
            type="button"
            className="text-sm font-semibold text-jade-600"
            onClick={() => onAddItem(category.id)}
          >
            {t('addItem')}
          </button>
        ) : null}
      </div>

      <ul className="mt-3 divide-y divide-border">
        {category.items.map((item) => (
          <li key={item.id}>
            <div className="flex items-start gap-2">
              {!selectMode ? (
                <MenuItemImage
                  storeId={storeId}
                  itemId={item.id}
                  imageKey={item.imageKey ?? null}
                  canUseImageEnhancement={canUseImageEnhancement}
                  busyAction={busyAction}
                  onBusyAction={onBusyAction}
                  onError={onError}
                  onMessage={onMessage}
                  onChanged={onChanged}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <MenuItemRow
                  item={item}
                  currency={currency}
                  label={labelForItem(item, baseLocale)}
                  busyAction={busyAction}
                  selectMode={selectMode}
                  selected={selectedIds.has(item.id)}
                  modifierCount={item.modifierGroups?.length ?? 0}
                  onToggleSelect={() => onToggleSelect(item.id)}
                  onCopy={() => onCopy(item.id)}
                  onDelete={() => onDelete(item.id, labelForItem(item, baseLocale))}
                  onToggleSoldOut={() => onToggleSoldOut(item.id, item.isSoldOut)}
                  onEditModifiers={() => onEditModifiers(item.id)}
                />
              </div>
            </div>
            {modifiersItemId === item.id && !selectMode ? (
              <MenuModifiersPanel
                storeId={storeId}
                itemId={item.id}
                itemName={labelForItem(item, baseLocale)}
                currency={currency}
                baseLocale={baseLocale}
                groups={item.modifierGroups ?? []}
                busyAction={busyAction}
                onBusyAction={onBusyAction}
                onError={onError}
                onChanged={onChanged}
                onClose={onCloseModifiers}
              />
            ) : null}
          </li>
        ))}
        {category.items.length === 0 ? (
          <li className="py-3 text-sm text-muted-foreground">{t('emptyItems')}</li>
        ) : null}
      </ul>

      {itemDraft?.categoryId === category.id && !selectMode ? (
        <MenuItemDraftForm
          draft={itemDraft}
          currency={currency}
          busyAction={busyAction}
          onChange={onChangeItemDraft}
          onCancel={() => onChangeItemDraft(null)}
          onSubmit={onSubmitItem}
          canUseVoiceAssistant={canUseVoiceAssistant}
        />
      ) : null}
    </li>
  );
}
