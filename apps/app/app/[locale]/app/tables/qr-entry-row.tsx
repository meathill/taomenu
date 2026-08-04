'use client';

import { ArrowSquareOutIcon, PencilSimpleIcon, QrCodeIcon, TrashIcon } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/button';

export type QrEntry = {
  id: string;
  name: string;
  tokenVersion: number;
  isActive: boolean;
  updatedAt: string;
};

type QrEntryRowProps = {
  entry: QrEntry;
  isEditing: boolean;
  editingName: string;
  busy: boolean;
  onEditingNameChange: (name: string) => void;
  onStartRename: () => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onRotate: () => void;
  onToggleActive: () => void;
};

export function QrEntryRow({
  entry,
  isEditing,
  editingName,
  busy,
  onEditingNameChange,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onRotate,
  onToggleActive,
}: QrEntryRowProps) {
  const t = useTranslations('tables');
  const updatedAt = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(entry.updatedAt));

  return (
    <li className="space-y-3 p-4">
      {isEditing ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={editingName}
            onChange={(event) => onEditingNameChange(event.target.value)}
            aria-label={t('rename')}
            className="min-h-11 flex-1 rounded-xl border border-border px-3 text-sm outline-none ring-jade-600 focus:ring-2"
          />
          <Button
            type="button"
            pending={busy}
            onClick={onSaveRename}
            className="min-h-11 rounded-xl bg-jade-600 px-3 text-xs font-bold text-white"
          >
            {t('save')}
          </Button>
          <Button
            type="button"
            onClick={onCancelRename}
            className="min-h-11 rounded-xl border border-border px-3 text-xs font-bold"
          >
            {t('cancel')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-ink-900">{entry.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {entry.isActive ? t('active') : t('inactive')} ·{' '}
              {t('tokenVersion', { version: entry.tokenVersion })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('lastUpdated', { date: updatedAt })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              pending={busy}
              onClick={onRotate}
              className="min-h-11 rounded-xl bg-jade-600 px-3 text-xs font-bold text-white"
            >
              <QrCodeIcon className="size-4" />
              {t('generateQr')}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={onStartRename}
              className="min-h-11 rounded-xl border border-border px-3 text-xs font-bold"
            >
              <PencilSimpleIcon className="size-4" />
              {t('rename')}
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={onToggleActive}
              className="min-h-11 rounded-xl border border-border px-3 text-xs font-bold"
            >
              {entry.isActive ? (
                <TrashIcon className="size-4 text-brand-600" />
              ) : (
                <ArrowSquareOutIcon className="size-4 text-jade-600" />
              )}
              {entry.isActive ? t('deactivate') : t('reactivate')}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
