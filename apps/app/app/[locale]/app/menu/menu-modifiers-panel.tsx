'use client';

import { formatVnd } from '@taomenu/shared';
import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/button';

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
  baseLocale: string;
  groups: ModifierGroupView[];
  busyAction: string | null;
  onBusyAction: (action: string | null) => void;
  onError: (message: string | null) => void;
  onChanged: () => Promise<void>;
  onClose: () => void;
};

function groupLabel(group: ModifierGroupView, baseLocale: string): string {
  return (
    group.translations.find((t) => t.locale === baseLocale)?.name ||
    group.translations[0]?.name ||
    '—'
  );
}

function optionLabel(option: ModifierOptionView, baseLocale: string): string {
  return (
    option.translations.find((t) => t.locale === baseLocale)?.name ||
    option.translations[0]?.name ||
    '—'
  );
}

export function MenuModifiersPanel({
  storeId,
  itemId,
  itemName,
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
  const [groupName, setGroupName] = useState('');
  const [groupRequired, setGroupRequired] = useState(true);
  const [optionDraft, setOptionDraft] = useState<{
    groupId: string;
    name: string;
    delta: string;
  } | null>(null);

  async function handleAddGroup(event: FormEvent) {
    event.preventDefault();
    if (!groupName.trim()) return;
    onBusyAction('addGroup');
    onError(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/menu/items/${itemId}/modifier-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName.trim(),
          isRequired: groupRequired,
          minSelected: groupRequired ? 1 : 0,
          maxSelected: groupRequired ? 1 : 3,
          locale: baseLocale,
        }),
      });
      if (!res.ok) {
        onError(t('addGroupFailed'));
        return;
      }
      setGroupName('');
      await onChanged();
    } finally {
      onBusyAction(null);
    }
  }

  async function handleDeleteGroup(groupId: string) {
    onBusyAction(`delGroup-${groupId}`);
    onError(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/menu/modifier-groups/${groupId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        onError(t('deleteGroupFailed'));
        return;
      }
      await onChanged();
    } finally {
      onBusyAction(null);
    }
  }

  async function handleAddOption(event: FormEvent) {
    event.preventDefault();
    if (!optionDraft) return;
    const priceDeltaAmount = Number(optionDraft.delta.replace(/\D/g, '') || '0');
    if (!optionDraft.name.trim() || !Number.isFinite(priceDeltaAmount)) {
      onError(t('invalidOption'));
      return;
    }
    onBusyAction(`saveOption-${optionDraft.groupId}`);
    onError(null);
    try {
      const res = await fetch(
        `/api/owner/stores/${storeId}/menu/modifier-groups/${optionDraft.groupId}/modifiers`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: optionDraft.name.trim(),
            priceDeltaAmount,
            locale: baseLocale,
          }),
        },
      );
      if (!res.ok) {
        onError(t('addOptionFailed'));
        return;
      }
      setOptionDraft(null);
      await onChanged();
    } finally {
      onBusyAction(null);
    }
  }

  async function handleDeleteOption(modifierId: string) {
    onBusyAction(`delOption-${modifierId}`);
    onError(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/menu/modifiers/${modifierId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        onError(t('deleteOptionFailed'));
        return;
      }
      await onChanged();
    } finally {
      onBusyAction(null);
    }
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-jade-600/30 bg-jade-50/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-jade-700">
            {t('modifiersTitle')}
          </p>
          <p className="text-sm font-bold text-ink-900">{itemName}</p>
        </div>
        <button type="button" className="text-sm font-semibold text-ink-900" onClick={onClose}>
          {tCommon('close')}
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('emptyGroupsHint')}</p>
      ) : null}

      <ul className="space-y-3">
        {groups.map((group) => (
          <li key={group.id} className="rounded-xl border border-border bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-ink-900">{groupLabel(group, baseLocale)}</p>
                <p className="text-xs text-muted-foreground">
                  {group.isRequired ? t('required') : t('optional')} ·{' '}
                  {t('chooseRange', { min: group.minSelected, max: group.maxSelected })}
                </p>
              </div>
              <Button
                type="button"
                pending={busyAction === `delGroup-${group.id}`}
                busy={busyAction !== null}
                className="text-xs font-bold text-brand-600"
                onClick={() => void handleDeleteGroup(group.id)}
              >
                {t('deleteGroup')}
              </Button>
            </div>
            <ul className="mt-2 divide-y divide-border">
              {group.options.map((option) => (
                <li key={option.id} className="flex items-center justify-between gap-2 py-2">
                  <span className="text-sm text-ink-900">
                    {optionLabel(option, baseLocale)}
                    {option.priceDeltaAmount > 0 ? (
                      <span className="ml-1 text-muted-foreground">
                        +{formatVnd(option.priceDeltaAmount)}
                      </span>
                    ) : null}
                    {!option.isAvailable ? (
                      <span className="ml-1 text-xs text-muted-foreground">{t('hiddenParen')}</span>
                    ) : null}
                  </span>
                  <Button
                    type="button"
                    pending={busyAction === `delOption-${option.id}`}
                    busy={busyAction !== null}
                    className="text-xs font-bold text-brand-600"
                    onClick={() => void handleDeleteOption(option.id)}
                  >
                    {t('deleteOption')}
                  </Button>
                </li>
              ))}
            </ul>
            {optionDraft?.groupId === group.id ? (
              <form onSubmit={(e) => void handleAddOption(e)} className="mt-2 space-y-2">
                <input
                  value={optionDraft.name}
                  onChange={(e) => setOptionDraft({ ...optionDraft, name: e.target.value })}
                  placeholder={t('optionName')}
                  className="min-h-11 w-full rounded-xl border border-border px-3 text-sm outline-none ring-jade-600 focus:ring-2"
                />
                <input
                  value={optionDraft.delta}
                  onChange={(e) => setOptionDraft({ ...optionDraft, delta: e.target.value })}
                  placeholder={t('priceDelta')}
                  inputMode="numeric"
                  className="min-h-11 w-full rounded-xl border border-border px-3 text-sm tabular-nums outline-none ring-jade-600 focus:ring-2"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="min-h-11 flex-1 rounded-xl border border-border text-xs font-bold"
                    onClick={() => setOptionDraft(null)}
                  >
                    {t('cancel')}
                  </button>
                  <Button
                    type="submit"
                    pending={busyAction === `saveOption-${optionDraft.groupId}`}
                    busy={busyAction !== null}
                    className="min-h-11 flex-1 rounded-xl bg-jade-600 text-xs font-bold text-white"
                  >
                    {t('saveOption')}
                  </Button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-jade-600"
                onClick={() => setOptionDraft({ groupId: group.id, name: '', delta: '0' })}
              >
                {t('addOption')}
              </button>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={(e) => void handleAddGroup(e)} className="space-y-2 rounded-xl bg-white p-3">
        <p className="text-sm font-semibold text-ink-900">{t('addGroupTitle')}</p>
        <input
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder={t('groupPlaceholder')}
          className="min-h-11 w-full rounded-xl border border-border px-3 text-sm outline-none ring-jade-600 focus:ring-2"
        />
        <label className="flex items-center gap-2 text-sm text-ink-900">
          <input
            type="checkbox"
            checked={groupRequired}
            onChange={(e) => setGroupRequired(e.target.checked)}
            className="size-4 accent-jade-600"
          />
          {t('groupRequired')}
        </label>
        <Button
          type="submit"
          pending={busyAction === 'addGroup'}
          busy={busyAction !== null}
          disabled={!groupName.trim()}
          className="min-h-11 w-full rounded-xl bg-jade-600 text-sm font-bold text-white"
        >
          {t('addGroup')}
        </Button>
      </form>
    </div>
  );
}
