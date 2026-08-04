'use client';

import { useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { getPublicAppUrl, joinPublicUrl } from '@/lib/public-url';
import { QrBatchCard } from './qr-batch-card';
import { type BatchQrEntry, type BatchQrLink, rotateAllQrEntries } from './qr-batch-utils';
import { QrCreateForm } from './qr-create-form';
import { type QrEntry, QrEntryRow } from './qr-entry-row';
import { type QrLink, QrLinkCard } from './qr-link-card';

type TableRow = QrEntry & {
  token?: string;
};

type PointRow = QrEntry & {
  token?: string;
};

type TablesManagerProps = {
  storeId: string;
  storeSlug: string;
};

function appOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
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
  const [editing, setEditing] = useState<{ type: 'table' | 'point'; id: string } | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<QrLink | null>(null);
  const [batchLinks, setBatchLinks] = useState<BatchQrLink[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function showLink(url: string, label: string, filename: string) {
    setBatchLinks([]);
    setLastLink({ url, label, filename, copied: false });
    try {
      setQrDataUrl(await QRCode.toDataURL(url, { width: 320, margin: 1 }));
    } catch {
      setQrDataUrl(null);
    }
  }

  const load = useCallback(async () => {
    const [tableResponse, pointResponse] = await Promise.all([
      fetch(`/api/owner/stores/${storeId}/tables`),
      fetch(`/api/owner/stores/${storeId}/pickup-points`),
    ]);
    if (tableResponse.ok) {
      const data = (await tableResponse.json()) as { tables: TableRow[] };
      setTables(data.tables);
    }
    if (pointResponse.ok) {
      const data = (await pointResponse.json()) as { pickupPoints: PointRow[] };
      setPoints(data.pickupPoints);
    }
    if (!tableResponse.ok || !pointResponse.ok) setError(t('loadFailed'));
  }, [storeId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addTable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/owner/stores/${storeId}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tableName.trim() }),
      });
      const data = (await response.json()) as { table?: TableRow; error?: string };
      if (!response.ok || !data.table?.token) {
        setError(data.error || t('addTableFailed'));
        return;
      }
      await showLink(
        customerTableUrl(storeSlug, data.table.token),
        data.table.name,
        `taomenu-${storeSlug}-${data.table.name}.png`,
      );
      setTableName('');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function addPickup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/owner/stores/${storeId}/pickup-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: pointName.trim() }),
      });
      const data = (await response.json()) as { pickupPoint?: PointRow; error?: string };
      if (!response.ok || !data.pickupPoint?.token) {
        setError(data.error || t('addPickupFailed'));
        return;
      }
      await showLink(
        customerPickupUrl(storeSlug, data.pickupPoint.token),
        data.pickupPoint.name,
        `taomenu-${storeSlug}-${data.pickupPoint.name}.png`,
      );
      setPointName('');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function rotateTable(table: TableRow) {
    if (!window.confirm(t('rotateConfirm'))) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/owner/stores/${storeId}/tables/${table.id}/rotate`, {
        method: 'POST',
      });
      const data = (await response.json()) as { table?: TableRow; error?: string };
      if (!response.ok || !data.table?.token) {
        setError(data.error || t('rotateFailed'));
        return;
      }
      await showLink(
        customerTableUrl(storeSlug, data.table.token),
        data.table.name,
        `taomenu-${storeSlug}-${data.table.name}.png`,
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function rotatePoint(point: PointRow) {
    if (!window.confirm(t('rotateConfirm'))) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/owner/stores/${storeId}/pickup-points/${point.id}/rotate`,
        {
          method: 'POST',
        },
      );
      const data = (await response.json()) as { pickupPoint?: PointRow; error?: string };
      if (!response.ok || !data.pickupPoint?.token) {
        setError(data.error || t('rotateFailed'));
        return;
      }
      await showLink(
        customerPickupUrl(storeSlug, data.pickupPoint.token),
        data.pickupPoint.name,
        `taomenu-${storeSlug}-${data.pickupPoint.name}.png`,
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function rotateAllQr() {
    const entries: BatchQrEntry[] = [
      ...tables
        .filter((table) => table.isActive)
        .map((table) => ({ id: table.id, name: table.name, type: 'table' as const })),
      ...points
        .filter((point) => point.isActive)
        .map((point) => ({ id: point.id, name: point.name, type: 'point' as const })),
    ];
    if (entries.length === 0) return;
    if (!window.confirm(t('batchRotateConfirm', { count: entries.length }))) return;

    setBusy(true);
    setError(null);
    setLastLink(null);
    setQrDataUrl(null);
    try {
      const result = await rotateAllQrEntries(storeId, storeSlug, entries, (type, slug, token) =>
        type === 'table' ? customerTableUrl(slug, token) : customerPickupUrl(slug, token),
      );
      setBatchLinks(result.links);
      if (result.failed > 0) setError(t('batchFailed', { count: result.failed }));
      await load();
    } catch {
      setError(t('rotateFailed'));
    } finally {
      setBusy(false);
    }
  }

  function startRename(type: 'table' | 'point', id: string, name: string) {
    setEditing({ type, id });
    setEditingName(name);
  }

  async function saveRename() {
    if (!editing || !editingName.trim()) return;
    setBusy(true);
    setError(null);
    const path =
      editing.type === 'table'
        ? `/api/owner/stores/${storeId}/tables/${editing.id}`
        : `/api/owner/stores/${storeId}/pickup-points/${editing.id}`;
    try {
      const response = await fetch(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim() }),
      });
      if (!response.ok) {
        setError(t('renameFailed'));
        return;
      }
      setEditing(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function setActive(type: 'table' | 'point', id: string, isActive: boolean) {
    if (isActive && !window.confirm(t('deactivateConfirm'))) return;
    setBusy(true);
    setError(null);
    const path =
      type === 'table'
        ? `/api/owner/stores/${storeId}/tables/${id}`
        : `/api/owner/stores/${storeId}/pickup-points/${id}`;
    try {
      const response = await fetch(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!response.ok) {
        setError(t('statusFailed'));
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setLastLink((current) => (current ? { ...current, copied: true } : current));
    } catch {
      setError(t('copyFailed'));
    }
  }

  async function shareLink(url: string) {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'TaoMenu', url });
        return;
      } catch {
        // The user may cancel the share sheet; copying remains available.
      }
    }
    await copyLink(url);
  }

  const activeQrCount =
    tables.filter((table) => table.isActive).length +
    points.filter((point) => point.isActive).length;

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm font-semibold text-brand-600">{error}</p> : null}
      <QrBatchCard
        count={activeQrCount}
        links={batchLinks}
        busy={busy}
        onGenerate={() => void rotateAllQr()}
        onPrint={() => window.print()}
      />
      {lastLink ? (
        <QrLinkCard
          link={lastLink}
          qrDataUrl={qrDataUrl}
          onShare={(url) => void shareLink(url)}
          onCopy={(url) => void copyLink(url)}
          onPrint={() => window.print()}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-white p-5 text-sm leading-6 text-muted-foreground">
          {t('qrEmptyHint')}
        </div>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-black text-ink-900">{t('tables')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('tablesHint')}</p>
        </div>
        <QrCreateForm
          value={tableName}
          placeholder={t('tablePlaceholder')}
          addLabel={t('add')}
          busy={busy}
          onChange={setTableName}
          onSubmit={(event) => void addTable(event)}
        />
        <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
          {tables.map((table) => (
            <QrEntryRow
              key={table.id}
              entry={table}
              isEditing={editing?.type === 'table' && editing.id === table.id}
              editingName={editingName}
              busy={busy}
              onEditingNameChange={setEditingName}
              onStartRename={() => startRename('table', table.id, table.name)}
              onSaveRename={() => void saveRename()}
              onCancelRename={() => setEditing(null)}
              onRotate={() => void rotateTable(table)}
              onToggleActive={() => void setActive('table', table.id, table.isActive)}
            />
          ))}
          {tables.length === 0 ? (
            <li className="px-4 py-4 text-sm text-muted-foreground">{t('emptyTables')}</li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-black text-ink-900">{t('pickupPoints')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('pickupHint')}</p>
        </div>
        <QrCreateForm
          value={pointName}
          placeholder={t('pickupPlaceholder')}
          addLabel={t('add')}
          busy={busy}
          onChange={setPointName}
          onSubmit={(event) => void addPickup(event)}
        />
        <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
          {points.map((point) => (
            <QrEntryRow
              key={point.id}
              entry={point}
              isEditing={editing?.type === 'point' && editing.id === point.id}
              editingName={editingName}
              busy={busy}
              onEditingNameChange={setEditingName}
              onStartRename={() => startRename('point', point.id, point.name)}
              onSaveRename={() => void saveRename()}
              onCancelRename={() => setEditing(null)}
              onRotate={() => void rotatePoint(point)}
              onToggleActive={() => void setActive('point', point.id, point.isActive)}
            />
          ))}
          {points.length === 0 ? (
            <li className="px-4 py-4 text-sm text-muted-foreground">{t('emptyPickup')}</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
