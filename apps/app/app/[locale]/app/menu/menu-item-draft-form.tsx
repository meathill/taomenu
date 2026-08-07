'use client';

import { useTranslations } from 'next-intl';
import type { FormEvent } from 'react';
import { Button } from '@/components/button';

type ItemDraft = {
  categoryId: string;
  name: string;
  price: string;
};

type MenuItemDraftFormProps = {
  draft: ItemDraft;
  busyAction: string | null;
  onChange: (draft: ItemDraft) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
};

export function MenuItemDraftForm({
  draft,
  busyAction,
  onChange,
  onCancel,
  onSubmit,
}: MenuItemDraftFormProps) {
  const t = useTranslations('menu');
  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-2 rounded-xl bg-paper-50 p-3">
      <input
        value={draft.name}
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
        placeholder={t('itemName')}
        className="min-h-12 w-full rounded-xl border border-border bg-white px-3 text-base outline-none ring-jade-600 focus:ring-2"
      />
      <input
        value={draft.price}
        onChange={(e) => onChange({ ...draft, price: e.target.value })}
        placeholder={t('priceVnd')}
        inputMode="numeric"
        className="min-h-12 w-full rounded-xl border border-border bg-white px-3 text-base tabular-nums outline-none ring-jade-600 focus:ring-2"
      />
      <div className="flex gap-2">
        <button
          type="button"
          className="min-h-12 flex-1 rounded-xl border border-border text-sm font-bold"
          onClick={onCancel}
        >
          {t('cancel')}
        </button>
        <Button
          type="submit"
          pending={busyAction === 'addItem'}
          busy={busyAction !== null}
          className="min-h-12 flex-1 rounded-xl bg-jade-600 text-sm font-bold text-white"
        >
          {t('saveContinue')}
        </Button>
      </div>
    </form>
  );
}
