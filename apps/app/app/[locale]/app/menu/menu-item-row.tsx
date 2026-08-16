'use client';

import { CopyIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import { formatCurrency } from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/button';
import type { MenuItem } from './menu-types';

type MenuItemRowProps = {
  item: MenuItem;
  currency: string;
  label: string;
  isMissingTranslation: boolean;
  busyAction: string | null;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onToggleSoldOut: () => void;
};

export function MenuItemRow({
  item,
  currency,
  label,
  isMissingTranslation,
  busyAction,
  selectMode,
  selected,
  onToggleSelect,
  onEdit,
  onCopy,
  onDelete,
  onToggleSoldOut,
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
            {item.isSoldOut ? <span className="ml-2 text-brand-600">{t('soldOut')}</span> : null}
            {!item.isAvailable ? <span className="ml-2">{t('hidden')}</span> : null}
          </p>
          {isMissingTranslation ? (
            <p className="text-xs font-semibold text-terracotta-600">{t('needsTranslation')}</p>
          ) : null}
        </div>
      </div>
      {!selectMode ? (
        <div className="flex max-w-full flex-wrap items-center gap-0.5 sm:shrink-0 sm:justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            busy={busyAction !== null}
            className="text-jade-700"
          >
            <PencilSimpleIcon className="size-4" weight="bold" aria-hidden />
            {t('edit')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            pending={busyAction === `soldOut-${item.id}`}
            busy={busyAction !== null}
            onClick={onToggleSoldOut}
          >
            {item.isSoldOut ? t('inStockToggle') : t('soldOutToggle')}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            iconOnly
            pending={busyAction === `copy-${item.id}`}
            busy={busyAction !== null}
            onClick={onCopy}
            aria-label={t('copyItem')}
          >
            <CopyIcon className="size-4" weight="bold" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            iconOnly
            busy={busyAction !== null}
            onClick={onDelete}
            aria-label={t('deleteItem')}
            className="text-brand-600"
          >
            <TrashIcon className="size-4" weight="bold" aria-hidden />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
