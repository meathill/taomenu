'use client';

import {
  ArrowCounterClockwiseIcon,
  ArrowSquareOutIcon,
  CopyIcon,
  DownloadSimpleIcon,
  PencilSimpleIcon,
  ProhibitIcon,
} from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/button';
import { useQrDataUrl } from '@/components/qr-image';

export type QrEntry = {
  id: string;
  name: string;
  /** 明文固定 token，直接渲染二维码 */
  token: string;
  isActive: boolean;
};

type QrEntryRowProps = {
  entry: QrEntry;
  url: string;
  downloadFilename: string;
  isEditing: boolean;
  editingName: string;
  busyAction: string | null;
  onEditingNameChange: (name: string) => void;
  onStartRename: () => void;
  onSaveRename: () => void;
  onCancelRename: () => void;
  onToggleActive: () => void;
};

export function QrEntryRow({
  entry,
  url,
  downloadFilename,
  isEditing,
  editingName,
  busyAction,
  onEditingNameChange,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onToggleActive,
}: QrEntryRowProps) {
  const t = useTranslations('tables');
  const [copied, setCopied] = useState(false);
  const qrDataUrl = useQrDataUrl(url, 512);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 复制失败时保持原状，用户可改用「打开顾客页」
    }
  }

  if (isEditing) {
    return (
      <li className="p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={editingName}
            onChange={(event) => onEditingNameChange(event.target.value)}
            aria-label={t('rename')}
            className="min-h-11 flex-1 rounded-xl border border-border px-3 text-sm outline-none ring-jade-600 focus:ring-2"
          />
          <Button
            type="button"
            variant="default"
            pending={busyAction === 'rename'}
            busy={busyAction !== null}
            onClick={onSaveRename}
          >
            {t('save')}
          </Button>
          <Button type="button" variant="outline" onClick={onCancelRename}>
            {t('cancel')}
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="relative shrink-0 self-start">
        {qrDataUrl ? (
          // biome-ignore lint/performance/noImgElement: data URL QR，无需走 Next 图片优化
          <img
            src={qrDataUrl}
            alt={t('qrAlt')}
            className={[
              'size-24 rounded-lg border border-border bg-white p-1',
              entry.isActive ? '' : 'opacity-30 grayscale',
            ].join(' ')}
          />
        ) : (
          <div className="size-24 rounded-lg border border-border bg-white" aria-hidden />
        )}
        {entry.isActive ? null : (
          <span className="absolute inset-x-1 top-1/2 -translate-y-1/2 rounded-md bg-ink-900/80 px-1 py-0.5 text-center text-[10px] font-bold text-white">
            {t('inactive')}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink-900">{entry.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {entry.isActive ? t('active') : t('inactive')}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-0.5">
        <Button type="button" variant="ghost" size="sm" onClick={() => void copyLink()}>
          <CopyIcon className="size-4" />
          {copied ? t('copied') : t('copyLink')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          render={<a href={url} target="_blank" rel="noreferrer" />}
        >
          <ArrowSquareOutIcon className="size-4" />
          {t('openLink')}
        </Button>
        {qrDataUrl ? (
          <Button
            variant="ghost"
            size="sm"
            render={<a href={qrDataUrl} download={downloadFilename} />}
          >
            <DownloadSimpleIcon className="size-4" />
            {t('download')}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busyAction !== null}
          onClick={onStartRename}
        >
          <PencilSimpleIcon className="size-4" />
          {t('rename')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busyAction !== null}
          onClick={onToggleActive}
        >
          {entry.isActive ? (
            <ProhibitIcon className="size-4 text-brand-600" />
          ) : (
            <ArrowCounterClockwiseIcon className="size-4 text-jade-600" />
          )}
          {entry.isActive ? t('deactivate') : t('reactivate')}
        </Button>
      </div>
    </li>
  );
}
