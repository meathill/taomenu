'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/button';

type MenuBatchBarProps = {
  selectedCount: number;
  totalCount: number;
  busyAction: string | null;
  onSelectAll: () => void;
  onSoldOut: (isSoldOut: boolean) => void;
  onAvailability: (isAvailable: boolean) => void;
};

export function MenuBatchBar({
  selectedCount,
  totalCount,
  busyAction,
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
      <div className="flex flex-wrap gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          pending={busyAction === 'batchSoldOut'}
          busy={busyAction !== null}
          disabled={selectedCount === 0}
          onClick={() => onSoldOut(true)}
          className="text-brand-600"
        >
          {t('markSoldOut')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          pending={busyAction === 'batchSoldOut'}
          busy={busyAction !== null}
          disabled={selectedCount === 0}
          onClick={() => onSoldOut(false)}
          className="text-jade-700"
        >
          {t('markInStock')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          pending={busyAction === 'batchAvailability'}
          busy={busyAction !== null}
          disabled={selectedCount === 0}
          onClick={() => onAvailability(false)}
        >
          {t('hideItems')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          pending={busyAction === 'batchAvailability'}
          busy={busyAction !== null}
          disabled={selectedCount === 0}
          onClick={() => onAvailability(true)}
        >
          {t('showItems')}
        </Button>
      </div>
    </div>
  );
}
