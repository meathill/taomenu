'use client';

import { CheckIcon, PlusIcon } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { ResponsiveDrawer } from '@/components/responsive-drawer';
import { localizedName, type MenuCategory } from './menu-types';

type MenuCategoryDrawerProps = {
  open: boolean;
  storeId: string;
  categories: MenuCategory[];
  activeLocale: string;
  baseLocale: string;
  selectedId?: string;
  editingId?: string;
  onOpenChange: (open: boolean) => void;
  onSelect?: (categoryId: string) => void;
  onChanged: () => Promise<void>;
};

export function MenuCategoryDrawer({
  open,
  storeId,
  categories,
  activeLocale,
  baseLocale,
  selectedId,
  editingId,
  onOpenChange,
  onSelect,
  onChanged,
}: MenuCategoryDrawerProps) {
  const t = useTranslations('menu');
  const editing = categories.find((category) => category.id === editingId);
  const editingTranslation = editing?.translations.find(
    (translation) => translation.locale === activeLocale,
  );
  const [name, setName] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(editingTranslation?.name ?? '');
    setError(null);
  }, [editingTranslation?.name, open]);

  async function saveCategory() {
    if (!name.trim()) return;
    setIsPending(true);
    setError(null);
    try {
      const url = editing
        ? `/api/owner/stores/${storeId}/menu/categories/${editing.id}`
        : `/api/owner/stores/${storeId}/menu/categories`;
      const response = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), locale: activeLocale }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || t(editing ? 'editCategoryFailed' : 'addCategoryFailed'));
      }
      const data = (await response.json()) as { categoryId: string };
      await onChanged();
      if (!editing) onSelect?.(data.categoryId);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('addCategoryFailed'));
    } finally {
      setIsPending(false);
    }
  }

  const canCreate = activeLocale === baseLocale;
  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? t('editCategory') : t('chooseCategory')}
      description={editing ? t('editCategoryHint') : t('chooseCategoryHint')}
      footer={
        editing || canCreate ? (
          <Button
            pending={isPending}
            disabled={!name.trim()}
            onClick={() => void saveCategory()}
            className="min-h-12 w-full rounded-xl bg-jade-600 px-4 text-sm font-bold text-white sm:w-auto"
          >
            {editing ? t('save') : t('createCategory')}
          </Button>
        ) : undefined
      }
    >
      {!editing && onSelect ? (
        <ul className="space-y-2">
          {categories.map((category) => {
            const { label, isMissing } = localizedName(
              category.translations,
              activeLocale,
              baseLocale,
            );
            return (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(category.id);
                    onOpenChange(false);
                  }}
                  className="flex min-h-12 w-full items-center justify-between rounded-xl border border-border px-3 text-left text-sm font-semibold text-ink-900"
                >
                  <span>
                    {label}
                    {isMissing ? (
                      <span className="ml-2 text-xs text-terracotta-600">
                        {t('needsTranslation')}
                      </span>
                    ) : null}
                  </span>
                  {category.id === selectedId ? (
                    <CheckIcon className="size-5 text-jade-600" weight="bold" aria-hidden />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {editing || canCreate ? (
        <div className={editing ? '' : 'mt-6 border-t border-border pt-5'}>
          <label htmlFor="category-name" className="text-sm font-bold text-ink-900">
            {editing ? t('categoryName') : t('newCategory')}
          </label>
          <div className="mt-2 flex items-center gap-2">
            {!editing ? <PlusIcon className="size-5 shrink-0 text-jade-600" weight="bold" /> : null}
            <input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('categoryPlaceholder')}
              className="min-h-12 w-full rounded-xl border border-border px-3 text-base outline-none ring-jade-600 focus:ring-2"
            />
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm font-semibold text-brand-600">{error}</p> : null}
    </ResponsiveDrawer>
  );
}
