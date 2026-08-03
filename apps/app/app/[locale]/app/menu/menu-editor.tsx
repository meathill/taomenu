'use client';

import { SquaresFourIcon } from '@phosphor-icons/react';
import type { CreateCategoryBody, CreateItemBody } from '@taomenu/shared';
import { cn } from '@taomenu/ui';
import { useTranslations } from 'next-intl';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/button';
import { MenuBatchBar } from './menu-batch-bar';
import { MenuItemDraftForm } from './menu-item-draft-form';
import { MenuItemImage } from './menu-item-image';
import { MenuItemRow } from './menu-item-row';
import { MenuModifiersPanel, type ModifierGroupView } from './menu-modifiers-panel';

type MenuTree = {
  menu: {
    id: string;
    status: string;
    menuVersion: number;
    baseLocale: string;
  };
  categories: Array<{
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
  }>;
};

type MenuEditorProps = {
  storeId: string;
};

function labelForCategory(category: MenuTree['categories'][number], baseLocale: string): string {
  return (
    category.translations.find((t) => t.locale === baseLocale)?.name ||
    category.translations[0]?.name ||
    '—'
  );
}

function labelForItem(item: MenuTree['categories'][number]['items'][number], baseLocale: string) {
  return (
    item.translations.find((t) => t.locale === baseLocale)?.name ||
    item.translations[0]?.name ||
    '—'
  );
}

export function MenuEditor({ storeId }: MenuEditorProps) {
  const t = useTranslations('menu');
  const [tree, setTree] = useState<MenuTree | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [itemDraft, setItemDraft] = useState<{
    categoryId: string;
    name: string;
    price: string;
  } | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [modifiersItemId, setModifiersItemId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/owner/stores/${storeId}/menu`);
    if (!res.ok) {
      setError(t('loadFailed'));
      return;
    }
    setTree((await res.json()) as MenuTree);
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const allItemIds = useMemo(
    () => tree?.categories.flatMap((c) => c.items.map((i) => i.id)) ?? [],
    [tree],
  );

  function toggleSelected(itemId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  async function handleAddCategory(event: FormEvent) {
    event.preventDefault();
    if (!categoryName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const body: CreateCategoryBody = { name: categoryName.trim() };
      const res = await fetch(`/api/owner/stores/${storeId}/menu/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || t('addCategoryFailed'));
        return;
      }
      setCategoryName('');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleAddItem(event: FormEvent) {
    event.preventDefault();
    if (!itemDraft) return;
    const priceAmount = Number(itemDraft.price.replace(/\D/g, ''));
    if (!itemDraft.name.trim() || !Number.isFinite(priceAmount)) {
      setError(t('invalidNamePrice'));
      return;
    }
    const categoryId = itemDraft.categoryId;
    setBusy(true);
    setError(null);
    try {
      const body: CreateItemBody = {
        categoryId,
        name: itemDraft.name.trim(),
        priceAmount,
      };
      const res = await fetch(`/api/owner/stores/${storeId}/menu/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || t('addItemFailed'));
        return;
      }
      // 保存并继续：保留分类，清空名称/价格便于连录
      setItemDraft({ categoryId, name: '', price: '' });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleSoldOut(itemId: string, isSoldOut: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/menu/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSoldOut: !isSoldOut }),
      });
      if (!res.ok) {
        setError(t('soldOutFailed'));
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleCopyItem(itemId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/menu/items/${itemId}/copy`, {
        method: 'POST',
      });
      if (!res.ok) {
        setError(t('copyFailed'));
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleBatchSoldOut(isSoldOut: boolean) {
    if (selectedIds.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/menu/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: [...selectedIds], isSoldOut }),
      });
      if (!res.ok) {
        setError(t('batchFailed'));
        return;
      }
      exitSelectMode();
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleBatchAvailability(isAvailable: boolean) {
    if (selectedIds.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/menu/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: [...selectedIds], isAvailable }),
      });
      if (!res.ok) {
        setError(t('batchFailed'));
        return;
      }
      exitSelectMode();
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        issues?: Array<{ message: string }>;
      } | null;
      if (!res.ok) {
        setError(data?.issues?.[0]?.message || data?.error || t('publishFailed'));
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!tree) {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 text-sm text-muted-foreground">
        {error || t('loading')}
      </div>
    );
  }

  const baseLocale = tree.menu.baseLocale;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {t('status')}{' '}
            <span className="font-semibold text-ink-900">
              {tree.menu.status === 'published' ? t('published') : t('draft')}
            </span>
            {' · '}
            {t('version', { version: tree.menu.menuVersion })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || allItemIds.length === 0}
            onClick={() => {
              if (selectMode) exitSelectMode();
              else setSelectMode(true);
            }}
            className={cn(
              'inline-flex min-h-12 items-center gap-1.5 rounded-xl border px-3 text-sm font-bold disabled:opacity-60',
              selectMode ? 'border-jade-600 text-jade-600' : 'border-border text-ink-900',
            )}
          >
            <SquaresFourIcon className="size-4" weight="bold" aria-hidden />
            {selectMode ? t('cancelSelect') : t('selectMany')}
          </button>
          <Button
            type="button"
            pending={busy}
            onClick={() => void handlePublish()}
            className="min-h-12 rounded-xl bg-jade-600 px-4 text-sm font-bold text-white"
          >
            {t('publish')}
          </Button>
        </div>
      </div>

      {selectMode ? (
        <MenuBatchBar
          selectedCount={selectedIds.size}
          totalCount={allItemIds.length}
          busy={busy}
          onSelectAll={() => setSelectedIds(new Set(allItemIds))}
          onSoldOut={(v) => void handleBatchSoldOut(v)}
          onAvailability={(v) => void handleBatchAvailability(v)}
        />
      ) : null}

      {error ? <p className="text-sm font-medium text-brand-600">{error}</p> : null}

      <form
        onSubmit={(e) => void handleAddCategory(e)}
        className="rounded-2xl border border-border bg-white p-4"
      >
        <label className="text-sm font-semibold text-ink-900" htmlFor="new-cat">
          {t('addCategory')}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="new-cat"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder={t('categoryPlaceholder')}
            className="min-h-12 flex-1 rounded-xl border border-border px-3 text-base outline-none ring-jade-600 focus:ring-2"
          />
          <Button
            type="submit"
            pending={busy}
            disabled={!categoryName.trim()}
            className="min-h-12 rounded-xl bg-jade-600 px-4 text-sm font-bold text-white"
          >
            {t('add')}
          </Button>
        </div>
      </form>

      {tree.categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('emptyCategories')}</p>
      ) : null}

      <ul className="space-y-4">
        {tree.categories.map((category) => (
          <li key={category.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-ink-900">
                {labelForCategory(category, baseLocale)}
              </h2>
              {!selectMode ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-jade-600"
                  onClick={() => setItemDraft({ categoryId: category.id, name: '', price: '' })}
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
                        busy={busy}
                        onBusy={setBusy}
                        onError={setError}
                        onChanged={load}
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <MenuItemRow
                        item={item}
                        label={labelForItem(item, baseLocale)}
                        busy={busy}
                        selectMode={selectMode}
                        selected={selectedIds.has(item.id)}
                        modifierCount={item.modifierGroups?.length ?? 0}
                        onToggleSelect={() => toggleSelected(item.id)}
                        onCopy={() => void handleCopyItem(item.id)}
                        onToggleSoldOut={() => void toggleSoldOut(item.id, item.isSoldOut)}
                        onEditModifiers={() => setModifiersItemId(item.id)}
                      />
                    </div>
                  </div>
                  {modifiersItemId === item.id && !selectMode ? (
                    <MenuModifiersPanel
                      storeId={storeId}
                      itemId={item.id}
                      itemName={labelForItem(item, baseLocale)}
                      baseLocale={baseLocale}
                      groups={item.modifierGroups ?? []}
                      busy={busy}
                      onBusy={setBusy}
                      onError={setError}
                      onChanged={load}
                      onClose={() => setModifiersItemId(null)}
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
                busy={busy}
                onChange={setItemDraft}
                onCancel={() => setItemDraft(null)}
                onSubmit={(e) => void handleAddItem(e)}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
