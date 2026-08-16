'use client';

import { PlusIcon } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/button';
import {
  buildGroupSavePayload,
  createGroupDraft,
  type ModifierGroupDraft,
  moveDraft,
  persistedOrderIds,
  reconcileModifierDrafts,
} from './menu-modifier-draft';
import { MenuModifierGroupFrame } from './menu-modifier-group-frame';

export type ModifierOptionView = {
  id: string;
  priceDeltaAmount: number;
  isAvailable: boolean;
  translations: Array<{ locale: string; name: string }>;
};

export type ModifierGroupView = {
  id: string;
  minSelected: number;
  maxSelected: number;
  isRequired: boolean;
  translations: Array<{ locale: string; name: string }>;
  options: ModifierOptionView[];
};

type MenuModifiersPanelProps = {
  storeId: string;
  itemId: string;
  itemName: string;
  currency: string;
  baseLocale: string;
  groups: ModifierGroupView[];
  busyAction: string | null;
  onBusyAction: (action: string | null) => void;
  onError: (message: string | null) => void;
  onChanged: () => Promise<void>;
  onClose: () => void;
};

export function MenuModifiersPanel({
  storeId,
  itemId,
  itemName,
  currency,
  baseLocale,
  groups,
  busyAction,
  onBusyAction,
  onError,
  onChanged,
  onClose,
}: MenuModifiersPanelProps) {
  const t = useTranslations('menu');
  const tCommon = useTranslations('common');
  const [drafts, setDrafts] = useState<ModifierGroupDraft[]>([]);
  const itemIdRef = useRef(itemId);

  useEffect(() => {
    const itemChanged = itemIdRef.current !== itemId;
    itemIdRef.current = itemId;
    setDrafts((current) =>
      reconcileModifierDrafts(itemChanged ? [] : current, groups, baseLocale, currency),
    );
  }, [baseLocale, currency, groups, itemId]);

  function updateDraft(clientId: string, next: ModifierGroupDraft) {
    setDrafts((current) => current.map((draft) => (draft.clientId === clientId ? next : draft)));
  }

  async function handleSave(draft: ModifierGroupDraft) {
    const payload = buildGroupSavePayload(draft, baseLocale, currency);
    if (!payload.ok) {
      onError(t('invalidOption'));
      return;
    }
    const action = `saveGroup-${draft.clientId}`;
    onBusyAction(action);
    onError(null);
    try {
      const response = await fetch(
        draft.serverId
          ? `/api/owner/stores/${storeId}/menu/modifier-groups/${draft.serverId}`
          : `/api/owner/stores/${storeId}/menu/items/${itemId}/modifier-groups`,
        {
          method: draft.serverId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload.body),
        },
      );
      if (!response.ok) {
        onError(t(draft.serverId ? 'saveGroupFailed' : 'addGroupFailed'));
        return;
      }
      const data = (await response.json()) as { groupId: string };
      setDrafts((current) =>
        current.map((row) =>
          row.clientId === draft.clientId ? { ...row, serverId: data.groupId, dirty: false } : row,
        ),
      );
      await onChanged();
    } finally {
      onBusyAction(null);
    }
  }

  async function handleDelete(draft: ModifierGroupDraft) {
    if (!draft.serverId) {
      setDrafts((current) => current.filter((row) => row.clientId !== draft.clientId));
      return;
    }
    const action = `delGroup-${draft.serverId}`;
    onBusyAction(action);
    onError(null);
    try {
      const response = await fetch(
        `/api/owner/stores/${storeId}/menu/modifier-groups/${draft.serverId}`,
        { method: 'DELETE' },
      );
      if (!response.ok) {
        onError(t('deleteGroupFailed'));
        return;
      }
      setDrafts((current) => current.filter((row) => row.clientId !== draft.clientId));
      await onChanged();
    } finally {
      onBusyAction(null);
    }
  }

  async function handleMove(index: number, delta: -1 | 1) {
    const next = moveDraft(drafts, index, delta);
    if (next === drafts) return;
    setDrafts(next);
    const orderedIds = persistedOrderIds(next);
    if (orderedIds.length < 2) return;
    onBusyAction('reorderGroups');
    onError(null);
    try {
      const response = await fetch(
        `/api/owner/stores/${storeId}/menu/items/${itemId}/modifier-groups`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds }),
        },
      );
      if (!response.ok) {
        onError(t('reorderGroupsFailed'));
        setDrafts(drafts);
        return;
      }
      await onChanged();
    } finally {
      onBusyAction(null);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-jade-700">
            {t('modifiersTitle')}
          </p>
          <p className="text-sm font-bold text-ink-900">{itemName}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {tCommon('close')}
        </Button>
      </div>

      {drafts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('emptyGroupsHint')}</p>
      ) : (
        <ul className="space-y-3">
          {drafts.map((draft, index) => (
            <li key={draft.clientId}>
              <MenuModifierGroupFrame
                draft={draft}
                currency={currency}
                index={index}
                total={drafts.length}
                busyAction={busyAction}
                onChange={(next) => updateDraft(draft.clientId, next)}
                onMove={(delta) => void handleMove(index, delta)}
                onDelete={() => void handleDelete(draft)}
                onSave={() => void handleSave(draft)}
              />
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        busy={busyAction !== null}
        onClick={() => setDrafts((current) => [...current, createGroupDraft()])}
        className="w-full justify-center"
      >
        <PlusIcon className="size-5 text-jade-600" weight="bold" aria-hidden />
        {t('addGroup')}
      </Button>
    </div>
  );
}
