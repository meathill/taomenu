import { getPublicAppUrl, joinPublicUrl } from '@/lib/public-url';

export type QrEntryType = 'table' | 'point';

function appOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return getPublicAppUrl();
}

/** 顾客入口 URL；token 固定不变，URL 长期有效 */
export function customerEntryUrl(type: QrEntryType, storeSlug: string, token: string): string {
  return joinPublicUrl(appOrigin(), `/m/${storeSlug}/${type === 'table' ? 't' : 'p'}/${token}`);
}

export function qrDownloadFilename(storeSlug: string, entryName: string): string {
  return `taomenu-${storeSlug}-${entryName}.png`;
}
