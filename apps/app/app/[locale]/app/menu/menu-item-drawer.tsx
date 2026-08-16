'use client';

import { getCurrencyDecimals, parseCurrencyInput, sanitizeCurrencyInput } from '@taomenu/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { ResponsiveDrawer } from '@/components/responsive-drawer';
import { MenuCategoryDrawer } from './menu-category-drawer';
import { buildItemFormValues, shouldHydrateItemForm } from './menu-item-form';
import { MenuItemImage } from './menu-item-image';
import { MenuModifierTranslations } from './menu-modifier-translations';
import { MenuModifiersPanel } from './menu-modifiers-panel';
import { localizedName, type MenuCategory, type MenuItem } from './menu-types';

type MenuItemDrawerProps = {
  open: boolean;
  storeId: string;
  currency: string;
  categories: MenuCategory[];
  item: MenuItem | null;
  initialCategoryId?: string;
  activeLocale: string;
  baseLocale: string;
  canUseImageEnhancement: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => Promise<void>;
};

export function MenuItemDrawer({
  open,
  storeId,
  currency,
  categories,
  item,
  initialCategoryId,
  activeLocale,
  baseLocale,
  canUseImageEnhancement,
  onOpenChange,
  onChanged,
}: MenuItemDrawerProps) {
  const t = useTranslations('menu');
  const isBaseMode = activeLocale === baseLocale;
  const translation = item?.translations.find((entry) => entry.locale === activeLocale);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isSoldOut, setIsSoldOut] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [nestedCategoryOpen, setNestedCategoryOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const itemId = item?.id ?? null;
  const formSessionRef = useRef({ open: false, itemId: null as string | null });

  useEffect(() => {
    const { open: wasOpen, itemId: previousItemId } = formSessionRef.current;
    formSessionRef.current = { open, itemId };
    if (!shouldHydrateItemForm({ open, wasOpen, itemId, previousItemId })) return;

    const next = buildItemFormValues({
      item,
      translation,
      currency,
      initialCategoryId,
      fallbackCategoryId: categories[0]?.id,
    });
    setName(next.name);
    setDescription(next.description);
    setPrice(next.price);
    setCategoryId(next.categoryId);
    setIsAvailable(next.isAvailable);
    setIsSoldOut(next.isSoldOut);
    setError(null);
  }, [categories, currency, initialCategoryId, item, itemId, open, translation]);

  async function saveItem() {
    if (!name.trim() || (!item && !categoryId)) return;
    const priceAmount =
      item && !isBaseMode ? item.priceAmount : parseCurrencyInput(price, currency);
    if (priceAmount === null) {
      setError(t('invalidNamePrice'));
      return;
    }
    setIsPending(true);
    setError(null);
    try {
      const response = await fetch(
        item
          ? `/api/owner/stores/${storeId}/menu/items/${item.id}`
          : `/api/owner/stores/${storeId}/menu/items`,
        {
          method: item ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            description: item ? description.trim() || null : description.trim() || undefined,
            locale: activeLocale,
            ...(isBaseMode ? { categoryId, priceAmount, isAvailable, isSoldOut } : {}),
          }),
        },
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || t(item ? 'editItemFailed' : 'addItemFailed'));
      }
      await onChanged();
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('addItemFailed'));
    } finally {
      setIsPending(false);
    }
  }

  const selectedCategory = categories.find((category) => category.id === categoryId);
  const categoryLabel = selectedCategory
    ? localizedName(selectedCategory.translations, activeLocale, baseLocale).label
    : t('chooseCategory');

  return (
    <>
      <ResponsiveDrawer
        open={open}
        onOpenChange={onOpenChange}
        title={item ? t('editItem') : t('addItem')}
        description={isBaseMode ? t('itemDrawerBaseHint') : t('itemDrawerTranslationHint')}
        footer={
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none"
            >
              {t('cancel')}
            </Button>
            <Button
              variant="default"
              size="lg"
              pending={isPending}
              disabled={!name.trim() || (isBaseMode && (!categoryId || !price))}
              onClick={() => void saveItem()}
              className="flex-1 sm:flex-none"
            >
              {t('save')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block text-sm font-bold text-ink-900">
            {t('itemName')}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={
                translation?.name ??
                item?.translations.find((entry) => entry.locale === baseLocale)?.name ??
                t('itemName')
              }
              className="mt-1 min-h-12 w-full rounded-xl border border-border px-3 text-base outline-none ring-jade-600 focus:ring-2"
            />
          </label>
          <label className="block text-sm font-bold text-ink-900">
            {t('description')}
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-base outline-none ring-jade-600 focus:ring-2"
            />
          </label>
          {isBaseMode ? (
            <>
              <label className="block text-sm font-bold text-ink-900">
                {t('price', { currency })}
                <input
                  value={price}
                  onChange={(event) =>
                    setPrice(sanitizeCurrencyInput(event.target.value, currency))
                  }
                  inputMode={getCurrencyDecimals(currency) > 0 ? 'decimal' : 'numeric'}
                  className="mt-1 min-h-12 w-full rounded-xl border border-border px-3 text-base tabular-nums outline-none ring-jade-600 focus:ring-2"
                />
              </label>
              <div>
                <span className="text-sm font-bold text-ink-900">{t('categoryName')}</span>
                <button
                  type="button"
                  onClick={() => setNestedCategoryOpen(true)}
                  className="mt-1 flex min-h-12 w-full items-center justify-between rounded-xl border border-border px-3 text-left text-sm font-semibold hover:bg-muted"
                >
                  {categoryLabel}
                  <span aria-hidden>›</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex min-h-12 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(event) => setIsAvailable(event.target.checked)}
                    className="size-4 accent-jade-600"
                  />
                  {t('available')}
                </label>
                <label className="flex min-h-12 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={isSoldOut}
                    onChange={(event) => setIsSoldOut(event.target.checked)}
                    className="size-4 accent-jade-600"
                  />
                  {t('soldOut')}
                </label>
              </div>
            </>
          ) : null}
        </div>

        {item && isBaseMode ? (
          <div className="mt-6 border-t border-border pt-5">
            <MenuItemImage
              storeId={storeId}
              itemId={item.id}
              imageKey={item.imageKey}
              canUseImageEnhancement={canUseImageEnhancement}
              busyAction={busyAction}
              onBusyAction={setBusyAction}
              onError={setError}
              onMessage={() => undefined}
              onChanged={onChanged}
            />
            <MenuModifiersPanel
              storeId={storeId}
              itemId={item.id}
              itemName={translation?.name ?? name}
              currency={currency}
              baseLocale={baseLocale}
              groups={item.modifierGroups}
              busyAction={busyAction}
              onBusyAction={setBusyAction}
              onError={setError}
              onChanged={onChanged}
              onClose={() => undefined}
            />
          </div>
        ) : null}
        {item && !isBaseMode ? (
          <MenuModifierTranslations
            storeId={storeId}
            item={item}
            activeLocale={activeLocale}
            baseLocale={baseLocale}
            onChanged={onChanged}
          />
        ) : null}
        {error ? <p className="mt-3 text-sm font-semibold text-brand-600">{error}</p> : null}
      </ResponsiveDrawer>
      <MenuCategoryDrawer
        open={nestedCategoryOpen}
        storeId={storeId}
        categories={categories}
        activeLocale={baseLocale}
        baseLocale={baseLocale}
        selectedId={categoryId}
        onOpenChange={setNestedCategoryOpen}
        onSelect={setCategoryId}
        onChanged={onChanged}
      />
    </>
  );
}
