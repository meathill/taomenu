'use client';

import { CameraIcon, FolderPlusIcon, PlusIcon, TranslateIcon } from '@phosphor-icons/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AsyncAlertDialog } from '@/components/async-alert-dialog';
import { Button } from '@/components/button';
import { MenuBatchBar } from './menu-batch-bar';
import { MenuCategoryCard } from './menu-category-card';
import { MenuCategoryDrawer } from './menu-category-drawer';
import { MenuEditorHeader } from './menu-editor-header';
import { MenuImportDrawer } from './menu-import-drawer';
import { MenuItemDrawer } from './menu-item-drawer';
import { MenuLanguageDrawer } from './menu-language-drawer';
import { MenuProTools } from './menu-pro-tools';
import type { MenuTree } from './menu-types';

type MenuEditorProps = {
  storeId: string;
  currency: string;
  activeMenuLocale: string;
  isPro: boolean;
  initialHideProTools: boolean;
  upgradeHref: string;
};

type DeleteTarget = { id: string; name: string };

export function MenuEditor({
  storeId,
  currency,
  activeMenuLocale,
  isPro,
  initialHideProTools,
  upgradeHref,
}: MenuEditorProps) {
  const t = useTranslations('menu');
  const interfaceLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tree, setTree] = useState<MenuTree | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [languageOpen, setLanguageOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [itemDrawerOpen, setItemDrawerOpen] = useState(false);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [initialCategoryId, setInitialCategoryId] = useState<string | undefined>();
  const [editingCategoryId, setEditingCategoryId] = useState<string | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const response = await fetch(`/api/owner/stores/${storeId}/menu`, { cache: 'no-store' });
    if (!response.ok) {
      setError(t('loadFailed'));
      return;
    }
    setTree((await response.json()) as MenuTree);
  }, [storeId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const allItemIds = useMemo(
    () => tree?.categories.flatMap((category) => category.items.map((item) => item.id)) ?? [],
    [tree],
  );
  const editingItem = useMemo(
    () =>
      tree?.categories
        .flatMap((category) => category.items)
        .find((item) => item.id === editingItemId) ?? null,
    [editingItemId, tree],
  );

  function toggleSelected(itemId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function openNewItem(categoryId?: string) {
    setEditingItemId(null);
    setInitialCategoryId(categoryId);
    setItemDrawerOpen(true);
  }

  function openEditItem(itemId: string) {
    setEditingItemId(itemId);
    setInitialCategoryId(
      tree?.categories.find((category) => category.items.some((item) => item.id === itemId))?.id,
    );
    setItemDrawerOpen(true);
  }

  function selectMenuLocale(locale: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (locale === tree?.menu.baseLocale) params.delete('menuLocale');
    else params.set('menuLocale', locale);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    setLanguageOpen(false);
  }

  async function updateItem(itemId: string, body: Record<string, unknown>, action: string) {
    setBusyAction(action);
    setError(null);
    try {
      const response = await fetch(`/api/owner/stores/${storeId}/menu/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(t('soldOutFailed'));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('soldOutFailed'));
    } finally {
      setBusyAction(null);
    }
  }

  async function copyItem(itemId: string) {
    setBusyAction(`copy-${itemId}`);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/owner/stores/${storeId}/menu/items/${itemId}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: interfaceLocale }),
      });
      if (!response.ok) throw new Error(t('copyFailed'));
      await load();
      setMessage(t('copyDone'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('copyFailed'));
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    const response = await fetch(`/api/owner/stores/${storeId}/menu/items/${deleteTarget.id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(t('deleteItemFailed'));
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(deleteTarget.id);
      return next;
    });
    await load();
    setMessage(t('deleteItemDone'));
  }

  async function batchUpdate(body: Record<string, unknown>, action: string) {
    if (selectedIds.size === 0) return;
    setBusyAction(action);
    setError(null);
    try {
      const response = await fetch(`/api/owner/stores/${storeId}/menu/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: [...selectedIds], ...body }),
      });
      if (!response.ok) throw new Error(t('batchFailed'));
      exitSelectMode();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('batchFailed'));
    } finally {
      setBusyAction(null);
    }
  }

  async function publishMenu() {
    setBusyAction('publish');
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/owner/stores/${storeId}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        issues?: Array<{ message: string }>;
      } | null;
      if (!response.ok) {
        throw new Error(data?.issues?.[0]?.message || data?.error || t('publishFailed'));
      }
      await load();
      setMessage(t('publishDone'));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('publishFailed'));
    } finally {
      setBusyAction(null);
    }
  }

  if (!tree) {
    return (
      <div className="rounded-2xl border border-border bg-white p-6">
        {error ? <p className="text-sm text-brand-600">{error}</p> : <p>{t('loading')}</p>}
      </div>
    );
  }

  const baseLocale = tree.menu.baseLocale;
  const languageName =
    new Intl.DisplayNames([interfaceLocale], { type: 'language' }).of(activeMenuLocale) ??
    activeMenuLocale;

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <MenuEditorHeader
        status={tree.menu.status}
        version={tree.menu.menuVersion}
        busyAction={busyAction}
        selectMode={selectMode}
        canPublish={allItemIds.length > 0}
        onToggleSelect={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
        onPublish={() => void publishMenu()}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setLanguageOpen(true)}>
          <TranslateIcon className="size-4 text-jade-600" weight="bold" aria-hidden />
          {languageName}
        </Button>
        <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
          <CameraIcon className="size-4 text-jade-600" weight="bold" aria-hidden />
          {t('photoImport')}
        </Button>
        {activeMenuLocale === baseLocale ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingCategoryId(undefined);
                setCategoryDrawerOpen(true);
              }}
            >
              <FolderPlusIcon className="size-4 text-jade-600" weight="bold" aria-hidden />
              {t('addCategory')}
            </Button>
            <Button
              type="button"
              variant="default"
              disabled={tree.categories.length === 0}
              onClick={() => openNewItem()}
            >
              <PlusIcon className="size-4" weight="bold" aria-hidden />
              {t('addItem')}
            </Button>
          </>
        ) : null}
      </div>

      {activeMenuLocale !== baseLocale ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t('translationModeHint', { language: languageName })}
        </p>
      ) : null}

      {selectMode ? (
        <MenuBatchBar
          selectedCount={selectedIds.size}
          totalCount={allItemIds.length}
          busyAction={busyAction}
          onSelectAll={() => setSelectedIds(new Set(allItemIds))}
          onSoldOut={(isSoldOut) => void batchUpdate({ isSoldOut }, 'batchSoldOut')}
          onAvailability={(isAvailable) => void batchUpdate({ isAvailable }, 'batchAvailability')}
        />
      ) : null}

      {error ? <p className="text-sm font-medium text-brand-600">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-jade-700">{message}</p> : null}

      {tree.categories.length === 0 ? (
        <section className="rounded-2xl border border-jade-600 bg-jade-50 p-5">
          <h2 className="text-lg font-black text-ink-900">{t('emptyTitle')}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{t('emptyHint')}</p>
        </section>
      ) : (
        <ul className="space-y-4">
          {tree.categories.map((category) => (
            <MenuCategoryCard
              key={category.id}
              category={category}
              activeLocale={activeMenuLocale}
              baseLocale={baseLocale}
              currency={currency}
              busyAction={busyAction}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onAddItem={openNewItem}
              onEditCategory={(categoryId) => {
                setEditingCategoryId(categoryId);
                setCategoryDrawerOpen(true);
              }}
              onEditItem={openEditItem}
              onToggleSelect={toggleSelected}
              onCopy={(itemId) => void copyItem(itemId)}
              onDelete={(id, name) => setDeleteTarget({ id, name })}
              onToggleSoldOut={(itemId, isSoldOut) =>
                void updateItem(itemId, { isSoldOut: !isSoldOut }, `soldOut-${itemId}`)
              }
            />
          ))}
        </ul>
      )}

      {!isPro ? (
        <MenuProTools initialHidden={initialHideProTools} upgradeHref={upgradeHref} />
      ) : null}

      <MenuLanguageDrawer
        open={languageOpen}
        storeId={storeId}
        baseLocale={baseLocale}
        activeLocale={activeMenuLocale}
        canUseAi={isPro}
        upgradeHref={upgradeHref}
        onOpenChange={setLanguageOpen}
        onSelectLocale={selectMenuLocale}
      />
      <MenuImportDrawer
        open={importOpen}
        storeId={storeId}
        baseLocale={baseLocale}
        currency={currency}
        canUseAi={isPro}
        upgradeHref={upgradeHref}
        onOpenChange={setImportOpen}
      />
      <MenuItemDrawer
        open={itemDrawerOpen}
        storeId={storeId}
        currency={currency}
        categories={tree.categories}
        item={editingItem}
        initialCategoryId={initialCategoryId}
        activeLocale={activeMenuLocale}
        baseLocale={baseLocale}
        canUseImageEnhancement={isPro}
        onOpenChange={setItemDrawerOpen}
        onChanged={load}
      />
      <MenuCategoryDrawer
        open={categoryDrawerOpen}
        storeId={storeId}
        categories={tree.categories}
        activeLocale={activeMenuLocale}
        baseLocale={baseLocale}
        editingId={editingCategoryId}
        onOpenChange={setCategoryDrawerOpen}
        onChanged={load}
      />
      <AsyncAlertDialog
        open={deleteTarget !== null}
        title={t('deleteItem')}
        description={t('deleteItemConfirm', { name: deleteTarget?.name ?? '' })}
        cancelLabel={t('cancel')}
        confirmLabel={t('deleteItem')}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onConfirm={deleteItem}
      />
    </div>
  );
}
