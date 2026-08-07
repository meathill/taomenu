'use client';

import { PrinterIcon } from '@phosphor-icons/react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { withStore } from '@/lib/active-store-utils';
import { customerEntryUrl, type QrEntryType, qrDownloadFilename } from './customer-url';
import { QrCreateForm } from './qr-create-form';
import { type QrEntry, QrEntryRow } from './qr-entry-row';

type TablesManagerProps = {
  storeId: string;
  storeSlug: string;
};

export function TablesManager({ storeId, storeSlug }: TablesManagerProps) {
  const t = useTranslations('tables');
  const [tables, setTables] = useState<QrEntry[]>([]);
  const [points, setPoints] = useState<QrEntry[]>([]);
  const [tableName, setTableName] = useState('');
  const [pointName, setPointName] = useState('');
  const [editing, setEditing] = useState<{ type: QrEntryType; id: string } | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [tableResponse, pointResponse] = await Promise.all([
      fetch(`/api/owner/stores/${storeId}/tables`),
      fetch(`/api/owner/stores/${storeId}/pickup-points`),
    ]);
    if (tableResponse.ok) {
      const data = (await tableResponse.json()) as { tables: QrEntry[] };
      setTables(data.tables);
    }
    if (pointResponse.ok) {
      const data = (await pointResponse.json()) as { pickupPoints: QrEntry[] };
      setPoints(data.pickupPoints);
    }
    if (!tableResponse.ok || !pointResponse.ok) setError(t('loadFailed'));
  }, [storeId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addEntry(event: FormEvent<HTMLFormElement>, type: QrEntryType) {
    event.preventDefault();
    const name = (type === 'table' ? tableName : pointName).trim();
    if (!name) return;
    setBusyAction(`add-${type}`);
    setError(null);
    try {
      const response = await fetch(
        `/api/owner/stores/${storeId}/${type === 'table' ? 'tables' : 'pickup-points'}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        },
      );
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setError(data.error || t(type === 'table' ? 'addTableFailed' : 'addPickupFailed'));
        return;
      }
      if (type === 'table') setTableName('');
      else setPointName('');
      await load();
    } finally {
      setBusyAction(null);
    }
  }

  function startRename(type: QrEntryType, id: string, name: string) {
    setEditing({ type, id });
    setEditingName(name);
  }

  async function saveRename() {
    if (!editing || !editingName.trim()) return;
    setBusyAction('rename');
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
      setBusyAction(null);
    }
  }

  async function toggleActive(type: QrEntryType, id: string, isActive: boolean) {
    if (isActive && !window.confirm(t('deactivateConfirm'))) return;
    setBusyAction(`toggle-${type}-${id}`);
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
      setBusyAction(null);
    }
  }

  function renderEntry(type: QrEntryType, entry: QrEntry) {
    const url = customerEntryUrl(type, storeSlug, entry.token);
    return (
      <QrEntryRow
        key={entry.id}
        entry={entry}
        url={url}
        downloadFilename={qrDownloadFilename(storeSlug, entry.name)}
        isEditing={editing?.type === type && editing.id === entry.id}
        editingName={editingName}
        busyAction={busyAction}
        onEditingNameChange={setEditingName}
        onStartRename={() => startRename(type, entry.id, entry.name)}
        onSaveRename={() => void saveRename()}
        onCancelRename={() => setEditing(null)}
        onToggleActive={() => void toggleActive(type, entry.id, entry.isActive)}
      />
    );
  }

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm font-semibold text-brand-600">{error}</p> : null}

      <div className="flex justify-end">
        <Link
          href={withStore('/app/tables/print', storeSlug)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-jade-600 px-4 text-sm font-bold text-white"
        >
          <PrinterIcon className="size-4" />
          {t('printSheet')}
        </Link>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-black text-ink-900">{t('tables')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('tablesHint')}</p>
        </div>
        <QrCreateForm
          value={tableName}
          placeholder={t('tablePlaceholder')}
          addLabel={t('add')}
          pending={busyAction === 'add-table'}
          busy={busyAction !== null}
          onChange={setTableName}
          onSubmit={(event) => void addEntry(event, 'table')}
        />
        <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
          {tables.map((table) => renderEntry('table', table))}
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
          pending={busyAction === 'add-point'}
          busy={busyAction !== null}
          onChange={setPointName}
          onSubmit={(event) => void addEntry(event, 'point')}
        />
        <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
          {points.map((point) => renderEntry('point', point))}
          {points.length === 0 ? (
            <li className="px-4 py-4 text-sm text-muted-foreground">{t('emptyPickup')}</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
