'use client';

import { type CreateCategoryBody, type CreateItemBody, parseCurrencyInput } from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/button';
import { MenuBatchBar } from './menu-batch-bar';
import { MenuCategoryCard } from './menu-category-card';
import { MenuEditorHeader } from './menu-editor-header';
import type { ModifierGroupView } from './menu-modifiers-panel';

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
  currency: string;
  canUseVoiceAssistant: boolean;
  canUseImageEnhancement: boolean;
};

type ItemDraft = {
  categoryId: string;
  name: string;
  price: string;
};

export function MenuEditor({
  storeId,
  currency,
  canUseVoiceAssistant,
  canUseImageEnhancement,
}: MenuEditorProps) {
  const t = useTranslations('menu');
  const locale = useLocale();
  const [tree, setTree] = useState<MenuTree | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [itemDraft, setItemDraft] = useState<ItemDraft | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [modifiersItemId, setModifiersItemId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/owner/stores/${storeId}/menu`, { cache: 'no-store' });
    if (!res.ok) {
      setError(t('loadFailed'));
      return;
    }
    setTree((await res.json()) as MenuTree);
  }, [storeId, t]);

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
    setBusyAction('addCategory');
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
      setBusyAction(null);
    }
  }

  async function handleAddItem(event: FormEvent) {
    event.preventDefault();
    if (!itemDraft) return;
    const priceAmount = parseCurrencyInput(itemDraft.price, currency);
    if (!itemDraft.name.trim() || priceAmount === null) {
      setError(t('invalidNamePrice'));
      return;
    }
    const categoryId = itemDraft.categoryId;
    setBusyAction('addItem');
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
      setBusyAction(null);
    }
  }

  async function toggleSoldOut(itemId: string, isSoldOut: boolean) {
    setBusyAction(`soldOut-${itemId}`);
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
      setBusyAction(null);
    }
  }

  async function handleCopyItem(itemId: string) {
    setBusyAction(`copy-${itemId}`);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/menu/items/${itemId}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      });
      if (!res.ok) {
        setError(t('copyFailed'));
        return;
      }
      await load();
      setMessage(t('copyDone'));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteItem(itemId: string, name: string) {
    if (!window.confirm(t('deleteItemConfirm', { name }))) return;
    setBusyAction(`delete-${itemId}`);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/menu/items/${itemId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        setError(t('deleteItemFailed'));
        return;
      }
      if (modifiersItemId === itemId) setModifiersItemId(null);
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(itemId);
        return next;
      });
      await load();
      setMessage(t('deleteItemDone'));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleBatchSoldOut(isSoldOut: boolean) {
    if (selectedIds.size === 0) return;
    setBusyAction('batchSoldOut');
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
      setBusyAction(null);
    }
  }

  async function handleBatchAvailability(isAvailable: boolean) {
    if (selectedIds.size === 0) return;
    setBusyAction('batchAvailability');
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
      setBusyAction(null);
    }
  }

  async function handlePublish() {
    setBusyAction('publish');
    setError(null);
    setMessage(null);
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
      setMessage(t('publishDone'));
    } finally {
      setBusyAction(null);
    }
  }

  if (!tree) {
    return (
      <div className="rounded-2xl border border-border bg-white p-6">
        {error ? (
          <p className="text-sm text-brand-600">{error}</p>
        ) : (
          <div className="animate-pulse space-y-3" role="status" aria-live="polite">
            <div className="h-4 w-32 rounded bg-paper-50" />
            <div className="h-12 rounded-xl bg-paper-50" />
            <div className="h-24 rounded-xl bg-paper-50" />
          </div>
        )}
      </div>
    );
  }

  const baseLocale = tree.menu.baseLocale;

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <MenuEditorHeader
        status={tree.menu.status}
        version={tree.menu.menuVersion}
        busyAction={busyAction}
        selectMode={selectMode}
        canPublish={allItemIds.length > 0}
        onToggleSelect={() => {
          if (selectMode) exitSelectMode();
          else setSelectMode(true);
        }}
        onPublish={() => void handlePublish()}
      />

      {selectMode ? (
        <MenuBatchBar
          selectedCount={selectedIds.size}
          totalCount={allItemIds.length}
          busyAction={busyAction}
          onSelectAll={() => setSelectedIds(new Set(allItemIds))}
          onSoldOut={(v) => void handleBatchSoldOut(v)}
          onAvailability={(v) => void handleBatchAvailability(v)}
        />
      ) : null}

      {error ? <p className="text-sm font-medium text-brand-600">{error}</p> : null}
      {message ? (
        <p className="text-sm font-semibold text-jade-700" role="status">
          {message}
        </p>
      ) : null}

      {tree.categories.length === 0 ? (
        <section className="rounded-2xl border border-jade-600 bg-jade-50 p-5">
          <h2 className="text-lg font-black text-ink-900">{t('emptyTitle')}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{t('emptyHint')}</p>
          <ol className="mt-4 space-y-2 text-sm font-semibold text-ink-900">
            <li>1. {t('emptyStepCategory')}</li>
            <li>2. {t('emptyStepItem')}</li>
            <li>3. {t('emptyStepPublish')}</li>
          </ol>
        </section>
      ) : null}

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
            pending={busyAction === 'addCategory'}
            busy={busyAction !== null}
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
          <MenuCategoryCard
            key={category.id}
            category={category}
            baseLocale={baseLocale}
            currency={currency}
            storeId={storeId}
            canUseImageEnhancement={canUseImageEnhancement}
            canUseVoiceAssistant={canUseVoiceAssistant}
            busyAction={busyAction}
            selectMode={selectMode}
            selectedIds={selectedIds}
            itemDraft={itemDraft}
            modifiersItemId={modifiersItemId}
            onAddItem={(categoryId) => setItemDraft({ categoryId, name: '', price: '' })}
            onToggleSelect={toggleSelected}
            onCopy={(itemId) => void handleCopyItem(itemId)}
            onDelete={(itemId, name) => void handleDeleteItem(itemId, name)}
            onToggleSoldOut={(itemId, isSoldOut) => void toggleSoldOut(itemId, isSoldOut)}
            onEditModifiers={setModifiersItemId}
            onBusyAction={setBusyAction}
            onError={setError}
            onMessage={setMessage}
            onChangeItemDraft={setItemDraft}
            onSubmitItem={(e) => void handleAddItem(e)}
            onCloseModifiers={() => setModifiersItemId(null)}
            onChanged={load}
          />
        ))}
      </ul>
    </div>
  );
}
