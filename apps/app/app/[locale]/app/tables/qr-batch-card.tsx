'use client';

import { DownloadSimpleIcon, PrinterIcon, QrCodeIcon } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/button';
import type { BatchQrLink } from './qr-batch-utils';

export type { BatchQrLink } from './qr-batch-utils';

type QrBatchCardProps = {
  count: number;
  links: BatchQrLink[];
  busy: boolean;
  onGenerate: () => void;
  onPrint: () => void;
};

export function QrBatchCard({ count, links, busy, onGenerate, onPrint }: QrBatchCardProps) {
  const t = useTranslations('tables');

  return (
    <section
      data-print-qr={links.length > 0 ? true : undefined}
      className="rounded-2xl border border-border bg-white p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <QrCodeIcon className="size-5 text-jade-600" weight="duotone" />
            <h2 className="text-lg font-black text-ink-900">{t('batchTitle')}</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {count > 0 ? t('batchHint', { count }) : t('batchEmpty')}
          </p>
          <p className="mt-3 rounded-xl bg-gold-50 p-3 text-xs leading-5 text-ink-900">
            {t('batchNotice')}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            pending={busy}
            disabled={count === 0}
            onClick={onGenerate}
            className="min-h-11 rounded-xl bg-jade-600 px-3 text-xs font-bold text-white"
          >
            <QrCodeIcon className="size-4" />
            {t('batchGenerate')}
          </Button>
          {links.length > 0 ? (
            <Button
              type="button"
              onClick={onPrint}
              className="min-h-11 rounded-xl border border-border px-3 text-xs font-bold text-ink-900"
            >
              <PrinterIcon className="size-4" />
              {t('batchPrint')}
            </Button>
          ) : null}
        </div>
      </div>
      {links.length > 0 ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <article key={link.url} className="rounded-xl border border-border p-3">
              {/* biome-ignore lint/performance/noImgElement: data URL QR for print/download */}
              <img
                src={link.qrDataUrl}
                alt={t('qrAlt')}
                className="mx-auto size-40 rounded-lg border border-border bg-white p-2"
              />
              <p className="mt-2 truncate text-sm font-bold text-ink-900">{link.label}</p>
              <p className="mt-1 break-all font-mono text-[10px] leading-4 text-muted-foreground">
                {link.url}
              </p>
              <a
                href={link.qrDataUrl}
                download={link.filename}
                className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-xs font-bold text-ink-900"
              >
                <DownloadSimpleIcon className="size-4" />
                {t('download')}
              </a>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
