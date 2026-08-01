'use client';

import type { FormEvent } from 'react';

type ItemDraft = {
  categoryId: string;
  name: string;
  price: string;
};

type MenuItemDraftFormProps = {
  draft: ItemDraft;
  busy: boolean;
  onChange: (draft: ItemDraft) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
};

export function MenuItemDraftForm({
  draft,
  busy,
  onChange,
  onCancel,
  onSubmit,
}: MenuItemDraftFormProps) {
  return (
    <form onSubmit={onSubmit} className="mt-3 space-y-2 rounded-xl bg-paper-50 p-3">
      <input
        value={draft.name}
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
        placeholder="Tên món"
        className="min-h-12 w-full rounded-xl border border-border bg-white px-3 text-base outline-none ring-jade-600 focus:ring-2"
      />
      <input
        value={draft.price}
        onChange={(e) => onChange({ ...draft, price: e.target.value })}
        placeholder="Giá (VND)"
        inputMode="numeric"
        className="min-h-12 w-full rounded-xl border border-border bg-white px-3 text-base tabular-nums outline-none ring-jade-600 focus:ring-2"
      />
      <div className="flex gap-2">
        <button
          type="button"
          className="min-h-12 flex-1 rounded-xl border border-border text-sm font-bold"
          onClick={onCancel}
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 flex-1 rounded-xl bg-jade-600 text-sm font-bold text-white disabled:opacity-60"
        >
          Lưu & tiếp
        </button>
      </div>
    </form>
  );
}
