'use client';

import { useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { getPublicAppUrl, joinPublicUrl } from '@/lib/public-url';

type TableRow = {
  id: string;
  name: string;
  tokenVersion: number;
  token?: string;
};

type PointRow = {
  id: string;
  name: string;
  token?: string;
};

type TablesManagerProps = {
  storeId: string;
  storeSlug: string;
};

type LastLink = {
  url: string;
  copied: boolean;
};

/** 浏览器内优先当前 origin（任意 workers.dev / 自定义域均可扫码）；SSR/缺省用 env。 */
function appOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return getPublicAppUrl();
}

function customerTableUrl(storeSlug: string, token: string): string {
  return joinPublicUrl(appOrigin(), `/m/${storeSlug}/t/${token}`);
}

function customerPickupUrl(storeSlug: string, token: string): string {
  return joinPublicUrl(appOrigin(), `/m/${storeSlug}/p/${token}`);
}

export function TablesManager({ storeId, storeSlug }: TablesManagerProps) {
  const t = useTranslations('tables');
  const [tables, setTables] = useState<TableRow[]>([]);
  const [points, setPoints] = useState<PointRow[]>([]);
  const [tableName, setTableName] = useState('');
  const [pointName, setPointName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<LastLink | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function showLink(url: string) {
    setLastLink({ url, copied: false });
    try {
      setQrDataUrl(await QRCode.toDataURL(url, { width: 240, margin: 1 }));
    } catch {
      setQrDataUrl(null);
    }
  }

  const load = useCallback(async () => {
    const [tRes, pRes] = await Promise.all([
      fetch(`/api/owner/stores/${storeId}/tables`),
      fetch(`/api/owner/stores/${storeId}/pickup-points`),
    ]);
    if (tRes.ok) {
      const data = (await tRes.json()) as { tables: TableRow[] };
      setTables(data.tables);
    }
    if (pRes.ok) {
      const data = (await pRes.json()) as { pickupPoints: PointRow[] };
      setPoints(data.pickupPoints);
    }
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addTable(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tableName.trim() }),
      });
      const data = (await res.json()) as { table?: TableRow; error?: string };
      if (!res.ok || !data.table?.token) {
        setError(data.error || t('addTableFailed'));
        return;
      }
      await showLink(customerTableUrl(storeSlug, data.table.token));
      setTableName('');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function rotateTable(tableId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/tables/${tableId}/rotate`, {
        method: 'POST',
      });
      const data = (await res.json()) as { table?: TableRow; error?: string };
      if (!res.ok || !data.table?.token) {
        setError(data.error || t('rotateFailed'));
        return;
      }
      await showLink(customerTableUrl(storeSlug, data.table.token));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function addPickup(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/pickup-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pointName.trim() }),
      });
      const data = (await res.json()) as { pickupPoint?: PointRow; error?: string };
      if (!res.ok || !data.pickupPoint?.token) {
        setError(data.error || t('addPickupFailed'));
        return;
      }
      await showLink(customerPickupUrl(storeSlug, data.pickupPoint.token));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function shareLink(url: string) {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'TaoMenu', url });
        return;
      } catch {
        // fall through
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setLastLink({ url, copied: true });
    } catch {
      setLastLink({ url, copied: false });
    }
  }

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm font-medium text-brand-600">{error}</p> : null}
      {lastLink ? (
        <div className="rounded-2xl border border-jade-600 bg-white p-4 text-sm">
          <p className="font-semibold text-ink-900">{t('qrTitle')}</p>
          {qrDataUrl ? (
            // biome-ignore lint/performance/noImgElement: data URL QR for print/share
            <img
              src={qrDataUrl}
              alt="QR code"
              className="mx-auto mt-3 size-48 rounded-xl border border-border bg-white p-2"
            />
          ) : null}
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
            {lastLink.url}
            {lastLink.copied ? ` ${t('copied')}` : ''}
          </p>
          <button
            type="button"
            className="mt-3 min-h-11 w-full rounded-xl bg-jade-600 px-4 text-sm font-bold text-white"
            onClick={() => void shareLink(lastLink.url)}
          >
            {t('shareCopy')}
          </button>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-ink-900">{t('tables')}</h2>
        <form onSubmit={(e) => void addTable(e)} className="flex gap-2">
          <input
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder={t('tablePlaceholder')}
            className="min-h-12 flex-1 rounded-xl border border-border px-3 text-base outline-none ring-jade-600 focus:ring-2"
          />
          <Button
            type="submit"
            pending={busy}
            disabled={!tableName.trim()}
            className="min-h-12 rounded-xl bg-jade-600 px-4 text-sm font-bold text-white"
          >
            {t('add')}
          </Button>
        </form>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
          {tables.map((table) => (
            <li key={table.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-semibold text-ink-900">{table.name}</p>
                <p className="text-xs text-muted-foreground">
                  {t('tokenVersion', { version: table.tokenVersion })}
                </p>
              </div>
              <Button
                type="button"
                pending={busy}
                onClick={() => void rotateTable(table.id)}
                className="min-h-11 rounded-xl border border-border px-3 text-xs font-bold"
              >
                {t('rotate')}
              </Button>
            </li>
          ))}
          {tables.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">{t('emptyTables')}</li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-ink-900">{t('pickupPoints')}</h2>
        <form onSubmit={(e) => void addPickup(e)} className="flex gap-2">
          <input
            value={pointName}
            onChange={(e) => setPointName(e.target.value)}
            placeholder={t('pickupPlaceholder')}
            className="min-h-12 flex-1 rounded-xl border border-border px-3 text-base outline-none ring-jade-600 focus:ring-2"
          />
          <Button
            type="submit"
            pending={busy}
            disabled={!pointName.trim()}
            className="min-h-12 rounded-xl bg-jade-600 px-4 text-sm font-bold text-white"
          >
            {t('add')}
          </Button>
        </form>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
          {points.map((point) => (
            <li key={point.id} className="px-4 py-3 font-semibold text-ink-900">
              {point.name}
            </li>
          ))}
          {points.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">{t('emptyPickup')}</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
