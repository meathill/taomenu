'use client';

import {
  CopyIcon,
  DownloadSimpleIcon,
  PrinterIcon,
  QrCodeIcon,
  ShareNetworkIcon,
} from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/button';

export type QrLink = {
  url: string;
  filename: string;
  label: string;
  copied: boolean;
};

type QrLinkCardProps = {
  link: QrLink;
  qrDataUrl: string | null;
  onShare: (url: string) => void;
  onCopy: (url: string) => void;
  onPrint: () => void;
};

export function QrLinkCard({ link, qrDataUrl, onShare, onCopy, onPrint }: QrLinkCardProps) {
  const t = useTranslations('tables');

  return (
    <section data-print-qr className="rounded-2xl border border-jade-600 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-jade-600">{t('qrTitle')}</p>
          <h2 className="mt-1 text-xl font-black text-ink-900">{link.label}</h2>
        </div>
        <QrCodeIcon className="size-7 text-jade-600" weight="duotone" />
      </div>
      {qrDataUrl ? (
        // biome-ignore lint/performance/noImgElement: data URL QR for print/share
        <img
          src={qrDataUrl}
          alt={t('qrAlt')}
          className="mx-auto mt-4 size-64 rounded-xl border border-border bg-white p-2"
        />
      ) : null}
      <p className="mt-3 break-all font-mono text-xs text-muted-foreground">{link.url}</p>
      <p className="mt-3 rounded-xl bg-gold-50 p-3 text-xs leading-5 text-ink-900">
        {t('qrNotice')}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Button
          type="button"
          onClick={() => onShare(link.url)}
          className="min-h-11 rounded-xl bg-jade-600 text-xs font-bold text-white"
        >
          <ShareNetworkIcon className="size-4" />
          {t('share')}
        </Button>
        <Button
          type="button"
          onClick={() => onCopy(link.url)}
          className="min-h-11 rounded-xl border border-border text-xs font-bold text-ink-900"
        >
          <CopyIcon className="size-4" />
          {link.copied ? t('copied') : t('copyLink')}
        </Button>
        {qrDataUrl ? (
          <a
            href={qrDataUrl}
            download={link.filename}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border text-xs font-bold text-ink-900"
          >
            <DownloadSimpleIcon className="size-4" />
            {t('download')}
          </a>
        ) : null}
        <Button
          type="button"
          onClick={onPrint}
          className="min-h-11 rounded-xl border border-border text-xs font-bold text-ink-900"
        >
          <PrinterIcon className="size-4" />
          {t('print')}
        </Button>
      </div>
    </section>
  );
}
