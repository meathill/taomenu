'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/button';

type MenuBatchBarProps = {
  selectedCount: number;
  totalCount: number;
  busy: boolean;
  onSelectAll: () => void;
  onSoldOut: (isSoldOut: boolean) => void;
  onAvailability: (isAvailable: boolean) => void;
};

export function MenuBatchBar({
  selectedCount,
  totalCount,
  busy,
  onSelectAll,
  onSoldOut,
  onAvailability,
}: MenuBatchBarProps) {
  const t = useTranslations('menu');
  return (
    <div className="sticky top-0 z-10 space-y-2 rounded-2xl border border-jade-600/30 bg-jade-50 p-3 shadow-sm">
      <p className="text-sm font-semibold text-ink-900">
        {t('selectedCount', { count: selectedCount })}
        {selectedCount < totalCount ? (
          <button type="button" className="ml-2 text-jade-600 underline" onClick={onSelectAll}>
            {t('selectAll')}
          </button>
        ) : null}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          pending={busy}
          disabled={selectedCount === 0}
          onClick={() => onSoldOut(true)}
          className="min-h-11 rounded-xl border border-brand-600 px-3 text-xs font-bold text-brand-600"
        >
          {t('markSoldOut')}
        </Button>
        <Button
          type="button"
          pending={busy}
          disabled={selectedCount === 0}
          onClick={() => onSoldOut(false)}
          className="min-h-11 rounded-xl border border-jade-600 px-3 text-xs font-bold text-jade-600"
        >
          {t('markInStock')}
        </Button>
        <Button
          type="button"
          pending={busy}
          disabled={selectedCount === 0}
          onClick={() => onAvailability(false)}
          className="min-h-11 rounded-xl border border-border px-3 text-xs font-bold text-ink-900"
        >
          {t('hideItems')}
        </Button>
        <Button
          type="button"
          pending={busy}
          disabled={selectedCount === 0}
          onClick={() => onAvailability(true)}
          className="min-h-11 rounded-xl border border-border px-3 text-xs font-bold text-ink-900"
        >
          {t('showItems')}
        </Button>
      </div>
    </div>
  );
}
