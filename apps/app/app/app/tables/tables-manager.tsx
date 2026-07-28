'use client';

import { type FormEvent, useCallback, useEffect, useState } from 'react';

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

function customerTableUrl(storeSlug: string, token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
  return `${base}/m/${storeSlug}/t/${token}`;
}

function customerPickupUrl(storeSlug: string, token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
  return `${base}/m/${storeSlug}/p/${token}`;
}

export function TablesManager({ storeId, storeSlug }: TablesManagerProps) {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [points, setPoints] = useState<PointRow[]>([]);
  const [tableName, setTableName] = useState('');
  const [pointName, setPointName] = useState('Quầy');
  const [error, setError] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        setError(data.error || 'Tạo bàn thất bại.');
        return;
      }
      setLastLink(customerTableUrl(storeSlug, data.table.token));
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
        setError(data.error || 'Đổi mã thất bại.');
        return;
      }
      setLastLink(customerTableUrl(storeSlug, data.table.token));
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
        setError(data.error || 'Tạo điểm lấy món thất bại.');
        return;
      }
      setLastLink(customerPickupUrl(storeSlug, data.pickupPoint.token));
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
      setLastLink(`${url} (đã copy)`);
    } catch {
      setLastLink(url);
    }
  }

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm font-medium text-brand-600">{error}</p> : null}
      {lastLink ? (
        <div className="rounded-2xl border border-jade-600 bg-white p-4 text-sm">
          <p className="font-semibold text-ink-900">Link mã QR (chỉ hiện lần tạo/đổi)</p>
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{lastLink}</p>
          <button
            type="button"
            className="mt-3 min-h-11 rounded-xl bg-jade-600 px-4 text-sm font-bold text-white"
            onClick={() => void shareLink(lastLink.replace(' (đã copy)', ''))}
          >
            Chia sẻ / Copy
          </button>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-ink-900">Bàn</h2>
        <form onSubmit={(e) => void addTable(e)} className="flex gap-2">
          <input
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="Bàn 1"
            className="min-h-12 flex-1 rounded-xl border border-border px-3 text-base outline-none ring-jade-600 focus:ring-2"
          />
          <button
            type="submit"
            disabled={busy || !tableName.trim()}
            className="min-h-12 rounded-xl bg-jade-600 px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            Thêm
          </button>
        </form>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
          {tables.map((table) => (
            <li key={table.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-semibold text-ink-900">{table.name}</p>
                <p className="text-xs text-muted-foreground">token v{table.tokenVersion}</p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void rotateTable(table.id)}
                className="min-h-11 rounded-xl border border-border px-3 text-xs font-bold"
              >
                Đổi mã
              </button>
            </li>
          ))}
          {tables.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">Chưa có bàn.</li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-ink-900">Điểm lấy món</h2>
        <form onSubmit={(e) => void addPickup(e)} className="flex gap-2">
          <input
            value={pointName}
            onChange={(e) => setPointName(e.target.value)}
            placeholder="Quầy"
            className="min-h-12 flex-1 rounded-xl border border-border px-3 text-base outline-none ring-jade-600 focus:ring-2"
          />
          <button
            type="submit"
            disabled={busy || !pointName.trim()}
            className="min-h-12 rounded-xl bg-jade-600 px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            Thêm
          </button>
        </form>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
          {points.map((point) => (
            <li key={point.id} className="px-4 py-3 font-semibold text-ink-900">
              {point.name}
            </li>
          ))}
          {points.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted-foreground">Chưa có điểm lấy món.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
