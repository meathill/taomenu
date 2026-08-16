'use client';

import { CopyIcon, DownloadSimpleIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '@/components/button';
import { useQrDataUrl } from '@/components/qr-image';

type PromoLinkCardProps = {
  label: string;
  url: string;
  qrAlt: string;
  copyLabel: string;
  copiedLabel: string;
  downloadLabel: string;
  downloadFilename: string;
};

/**
 * 一条代理商推广链接：二维码 + 复制 + 下载 PNG。
 * 文案全部由调用方传入，因此 admin（namespace admin）与代理商后台（namespace agent）可以共用。
 */
export function PromoLinkCard({
  label,
  url,
  qrAlt,
  copyLabel,
  copiedLabel,
  downloadLabel,
  downloadFilename,
}: PromoLinkCardProps) {
  const [copied, setCopied] = useState(false);
  // 512 是下载用的分辨率，展示时缩到 96px
  const qrDataUrl = useQrDataUrl(url, 512);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 复制失败时保持原状，链接文本仍可手动选中
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 sm:flex-row sm:items-center">
      {qrDataUrl ? (
        // biome-ignore lint/performance/noImgElement: data URL QR，无需走 Next 图片优化
        <img
          src={qrDataUrl}
          alt={qrAlt}
          className="size-24 shrink-0 self-start rounded-lg border border-border bg-white p-1"
        />
      ) : (
        <div className="size-24 shrink-0 self-start rounded-lg border border-border bg-white" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink-900">{label}</p>
        <p className="mt-1 break-all text-xs text-muted-foreground">{url}</p>
        <div className="mt-3 flex flex-wrap items-center gap-0.5">
          <Button type="button" variant="ghost" size="sm" onClick={() => void copyLink()}>
            <CopyIcon className="size-4" />
            {copied ? copiedLabel : copyLabel}
          </Button>
          {qrDataUrl ? (
            <a
              href={qrDataUrl}
              download={downloadFilename}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-xs font-bold text-ink-900"
            >
              <DownloadSimpleIcon className="size-4" />
              {downloadLabel}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
