'use client';

import { SquaresFourIcon } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/button';

type MenuEditorHeaderProps = {
  status: string;
  version: number;
  busyAction: string | null;
  selectMode: boolean;
  canPublish: boolean;
  onToggleSelect: () => void;
  onPublish: () => void;
};

export function MenuEditorHeader({
  status,
  version,
  busyAction,
  selectMode,
  canPublish,
  onToggleSelect,
  onPublish,
}: MenuEditorHeaderProps) {
  const t = useTranslations('menu');

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 lg:sticky lg:top-4 lg:z-20 lg:bg-paper-50/95 lg:py-3 lg:backdrop-blur-sm">
      <div>
        <p className="text-sm text-muted-foreground">
          {t('status')}{' '}
          <span className="font-semibold text-ink-900">
            {status === 'published' ? t('published') : t('draft')}
          </span>
          {' · '}
          {t('version', { version })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busyAction !== null || !canPublish}
          onClick={onToggleSelect}
          className={selectMode ? 'text-jade-700' : undefined}
        >
          <SquaresFourIcon className="size-4" weight="bold" aria-hidden />
          {selectMode ? t('cancelSelect') : t('selectMany')}
        </Button>
        <Button
          type="button"
          pending={busyAction === 'publish'}
          busy={busyAction !== null}
          onClick={onPublish}
          className="fixed inset-x-4 bottom-4 z-30 min-h-12 rounded-xl bg-jade-600 px-4 text-sm font-bold text-white shadow-lg hover:bg-jade-600/90 lg:static lg:z-auto lg:shadow-none"
        >
          {t('publish')}
        </Button>
      </div>
    </div>
  );
}
