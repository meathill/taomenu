'use client';

import { CopyIcon } from '@phosphor-icons/react';
import { formatVnd } from '@taomenu/shared';
import { cn } from '@taomenu/ui';

export type MenuItemView = {
  id: string;
  priceAmount: number;
  isAvailable: boolean;
  isSoldOut: boolean;
  translations: Array<{ locale: string; name: string }>;
};

type MenuItemRowProps = {
  item: MenuItemView;
  label: string;
  busy: boolean;
  selectMode: boolean;
  selected: boolean;
  modifierCount?: number;
  onToggleSelect: () => void;
  onCopy: () => void;
  onToggleSoldOut: () => void;
  onEditModifiers: () => void;
};

export function MenuItemRow({
  item,
  label,
  busy,
  selectMode,
  selected,
  modifierCount = 0,
  onToggleSelect,
  onCopy,
  onToggleSoldOut,
  onEditModifiers,
}: MenuItemRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {selectMode ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="mt-1 size-5 shrink-0 accent-jade-600"
            aria-label={`Chọn ${label}`}
          />
        ) : null}
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">{label}</p>
          <p className="text-sm tabular-nums text-muted-foreground">
            {formatVnd(item.priceAmount)}
            {item.isSoldOut ? <span className="ml-2 font-semibold text-brand-600">Hết</span> : null}
            {!item.isAvailable ? (
              <span className="ml-2 font-semibold text-muted-foreground">Ẩn</span>
            ) : null}
          </p>
        </div>
      </div>
      {!selectMode ? (
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            disabled={busy}
            title="Tùy chọn"
            aria-label="Chỉnh tùy chọn món"
            onClick={onEditModifiers}
            className="min-h-11 shrink-0 rounded-xl border border-border px-2 text-xs font-bold text-ink-900 disabled:opacity-60"
          >
            Tùy chọn{modifierCount > 0 ? ` (${modifierCount})` : ''}
          </button>
          <button
            type="button"
            disabled={busy}
            title="Sao chép"
            aria-label="Sao chép món"
            onClick={onCopy}
            className="inline-flex size-11 items-center justify-center rounded-xl border border-border text-ink-900 disabled:opacity-60"
          >
            <CopyIcon className="size-4" weight="bold" aria-hidden />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onToggleSoldOut}
            className={cn(
              'min-h-11 shrink-0 rounded-xl border px-3 text-xs font-bold',
              item.isSoldOut ? 'border-jade-600 text-jade-600' : 'border-border text-ink-900',
            )}
          >
            {item.isSoldOut ? 'Còn hàng' : 'Báo hết'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
