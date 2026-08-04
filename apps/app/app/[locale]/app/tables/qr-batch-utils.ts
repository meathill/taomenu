import QRCode from 'qrcode';

export type BatchQrEntry = {
  id: string;
  name: string;
  type: 'table' | 'point';
};

export type BatchQrLink = {
  url: string;
  filename: string;
  label: string;
  qrDataUrl: string;
};

type RotateResponse = {
  table?: { name: string; token?: string };
  pickupPoint?: { name: string; token?: string };
};

export async function rotateAllQrEntries(
  storeId: string,
  storeSlug: string,
  entries: BatchQrEntry[],
  buildUrl: (type: BatchQrEntry['type'], slug: string, token: string) => string,
): Promise<{ links: BatchQrLink[]; failed: number }> {
  const links: BatchQrLink[] = [];
  let failed = 0;

  for (const entry of entries) {
    try {
      const endpoint =
        entry.type === 'table'
          ? `/api/owner/stores/${storeId}/tables/${entry.id}/rotate`
          : `/api/owner/stores/${storeId}/pickup-points/${entry.id}/rotate`;
      const response = await fetch(endpoint, { method: 'POST' });
      if (!response.ok) {
        failed += 1;
        continue;
      }

      const data = (await response.json()) as RotateResponse;
      const rotated = entry.type === 'table' ? data.table : data.pickupPoint;
      if (!rotated?.token) {
        failed += 1;
        continue;
      }

      const url = buildUrl(entry.type, storeSlug, rotated.token);
      links.push({
        url,
        label: rotated.name,
        filename: `taomenu-${storeSlug}-${rotated.name}.png`,
        qrDataUrl: await QRCode.toDataURL(url, { width: 320, margin: 1 }),
      });
    } catch {
      failed += 1;
    }
  }

  return { links, failed };
}
