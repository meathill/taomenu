'use client';

import { CopyIcon, TrashIcon } from '@phosphor-icons/react';
import { formatCurrency } from '@taomenu/shared';
import { cn } from '@taomenu/ui';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/button';

export type MenuItemView = {
  id: string;
  priceAmount: number;
  isAvailable: boolean;
  isSoldOut: boolean;
  translations: Array<{ locale: string; name: string }>;
};

type MenuItemRowProps = {
  item: MenuItemView;
  currency: string;
  label: string;
  busyAction: string | null;
  selectMode: boolean;
  selected: boolean;
  modifierCount?: number;
  onToggleSelect: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onToggleSoldOut: () => void;
  onEditModifiers: () => void;
};

export function MenuItemRow({
  item,
  currency,
  label,
  busyAction,
  selectMode,
  selected,
  modifierCount = 0,
  onToggleSelect,
  onCopy,
  onDelete,
  onToggleSoldOut,
  onEditModifiers,
}: MenuItemRowProps) {
  const t = useTranslations('menu');
  const locale = useLocale();
  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {selectMode ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="mt-1 size-5 shrink-0 accent-jade-600"
            aria-label={t('selectItemAria', { name: label })}
          />
        ) : null}
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">{label}</p>
          <p className="text-sm tabular-nums text-muted-foreground">
            {formatCurrency(item.priceAmount, currency, locale)}
            {item.isSoldOut ? (
              <span className="ml-2 font-semibold text-brand-600">{t('soldOut')}</span>
            ) : null}
            {!item.isAvailable ? (
              <span className="ml-2 font-semibold text-muted-foreground">{t('hidden')}</span>
            ) : null}
          </p>
        </div>
      </div>
      {!selectMode ? (
        <div className="flex max-w-full flex-wrap gap-1.5 sm:shrink-0 sm:justify-end">
          <Button
            type="button"
            busy={busyAction !== null}
            title={t('options')}
            aria-label={t('editOptions')}
            onClick={onEditModifiers}
            className="min-h-11 shrink-0 rounded-xl border border-border px-2 text-xs font-bold text-ink-900"
          >
            {t('options')}
            {modifierCount > 0 ? ` (${modifierCount})` : ''}
          </Button>
          <Button
            type="button"
            pending={busyAction === `copy-${item.id}`}
            busy={busyAction !== null}
            iconOnly
            title={t('copy')}
            aria-label={t('copyItem')}
            onClick={onCopy}
            className="size-11 rounded-xl border border-border text-ink-900"
          >
            <CopyIcon className="size-4" weight="bold" aria-hidden />
          </Button>
          <Button
            type="button"
            pending={busyAction === `delete-${item.id}`}
            busy={busyAction !== null}
            iconOnly
            title={t('deleteItem')}
            aria-label={t('deleteItem')}
            onClick={onDelete}
            className="size-11 rounded-xl border border-border text-brand-600"
          >
            <TrashIcon className="size-4" weight="bold" aria-hidden />
          </Button>
          <Button
            type="button"
            pending={busyAction === `soldOut-${item.id}`}
            busy={busyAction !== null}
            onClick={onToggleSoldOut}
            className={cn(
              'min-h-11 shrink-0 rounded-xl border px-3 text-xs font-bold',
              item.isSoldOut ? 'border-jade-600 text-jade-600' : 'border-border text-ink-900',
            )}
          >
            {item.isSoldOut ? t('inStockToggle') : t('soldOutToggle')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
