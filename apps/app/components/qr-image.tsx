'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** 由固定 URL 生成 QR data URL；URL 长期不变，可安全缓存渲染 */
export function useQrDataUrl(url: string, width = 256): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    QRCode.toDataURL(url, { width, margin: 1 })
      .then((value) => {
        if (!cancelled) setDataUrl(value);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url, width]);

  return dataUrl;
}

type QrImageProps = {
  url: string;
  alt: string;
  width?: number;
  className?: string;
};

export function QrImage({ url, alt, width = 256, className }: QrImageProps) {
  const dataUrl = useQrDataUrl(url, width);
  if (!dataUrl) {
    // 占位保持布局稳定，避免生成期间抖动
    return <div className={className} aria-hidden />;
  }
  // biome-ignore lint/performance/noImgElement: data URL QR，无需走 Next 图片优化
  return <img src={dataUrl} alt={alt} className={className} />;
}
