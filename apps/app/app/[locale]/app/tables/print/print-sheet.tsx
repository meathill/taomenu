'use client';

import { ArrowLeftIcon, CheckSquareIcon, PrinterIcon, SquareIcon } from '@phosphor-icons/react';
import type { PlanId } from '@taomenu/shared';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { Skeleton } from '@/components/ui/skeleton';
import { withStore } from '@/lib/active-store-utils';
import { customerEntryUrl } from '../customer-url';
import { QrCard } from '../qr-card';
import type { QrCardTemplateId } from '../qr-templates';
import { defaultSelectedKeys, type PrintableEntry, toPrintableEntries } from './printable-entries';
import { TemplatePreview } from './template-preview';

type PrintSheetProps = {
  storeId: string;
  storeSlug: string;
  storeName: string;
  plan: PlanId;
  /** 门店面向顾客语言（baseLocale）的扫码提示语 */
  scanHint: string;
  upgradeUrl: string;
};

type EntryRow = {
  id: string;
  name: string;
  token: string;
  isActive: boolean;
};

export function PrintSheet({
  storeId,
  storeSlug,
  storeName,
  plan,
  scanHint,
  upgradeUrl,
}: PrintSheetProps) {
  const t = useTranslations('tables');
  const [entries, setEntries] = useState<PrintableEntry[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [templateId, setTemplateId] = useState<QrCardTemplateId>('standard');
  const [loadFailed, setLoadFailed] = useState(false);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      const [tableResponse, pointResponse] = await Promise.all([
        fetch(`/api/owner/stores/${storeId}/tables`, { cache: 'no-store' }),
        fetch(`/api/owner/stores/${storeId}/pickup-points`, { cache: 'no-store' }),
      ]);
      if (!tableResponse.ok || !pointResponse.ok) {
        setLoadFailed(true);
        return;
      }
      const tableData = (await tableResponse.json()) as { tables: EntryRow[] };
      const pointData = (await pointResponse.json()) as { pickupPoints: EntryRow[] };
      const printable = toPrintableEntries(tableData.tables, pointData.pickupPoints);
      setEntries(printable);
      setSelected(defaultSelectedKeys(printable));
    } catch {
      setLoadFailed(true);
    }
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleEntry(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const printable = (entries ?? []).filter((entry) => selected.has(entry.key));

  return (
    <div className="space-y-6">
      <div className="space-y-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={withStore('/app/tables', storeSlug)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-white px-3 text-xs font-bold text-ink-900"
          >
            <ArrowLeftIcon className="size-4" />
            {t('printBack')}
          </Link>
          <Button
            type="button"
            disabled={printable.length === 0}
            onClick={() => window.print()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-jade-600 px-4 text-sm font-bold text-white"
          >
            <PrinterIcon className="size-4" />
            {t('print')} ({printable.length})
          </Button>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">{t('printTitle')}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('printSubtitle')}</p>
        </div>

        <TemplatePreview
          storeName={storeName}
          storeSlug={storeSlug}
          plan={plan}
          scanHint={scanHint}
          qrAlt={t('qrAlt')}
          upgradeUrl={upgradeUrl}
          selectedTemplateId={templateId}
          onSelectTemplate={setTemplateId}
        />

        <section className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink-900">{t('entriesLabel')}</h2>
            {entries && entries.length > 0 ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(defaultSelectedKeys(entries))}
                  className="min-h-10 rounded-lg px-2 text-xs font-bold text-jade-600"
                >
                  {t('selectAll')}
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="min-h-10 rounded-lg px-2 text-xs font-bold text-muted-foreground"
                >
                  {t('clearAll')}
                </button>
              </div>
            ) : null}
          </div>
          {entries === null ? (
            loadFailed ? (
              <p className="text-sm text-brand-600">{t('loadFailed')}</p>
            ) : (
              <div
                role="status"
                className="flex flex-wrap gap-2"
                aria-label={t('loading')}
                aria-busy="true"
              >
                <Skeleton className="h-11 w-24 rounded-xl" />
                <Skeleton className="h-11 w-24 rounded-xl" />
                <Skeleton className="h-11 w-24 rounded-xl" />
              </div>
            )
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('printEmpty')}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {entries.map((entry) => {
                const checked = selected.has(entry.key);
                return (
                  <li key={entry.key}>
                    <button
                      type="button"
                      onClick={() => toggleEntry(entry.key)}
                      aria-pressed={checked}
                      className={[
                        'inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-bold',
                        checked
                          ? 'border-jade-600 bg-white text-ink-900'
                          : 'border-border bg-white text-muted-foreground',
                      ].join(' ')}
                    >
                      {checked ? (
                        <CheckSquareIcon className="size-4 text-jade-600" weight="fill" />
                      ) : (
                        <SquareIcon className="size-4" />
                      )}
                      {entry.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {printable.length > 0 ? (
        <div className="overflow-x-auto">
          <div className="grid w-fit grid-cols-1 gap-[6mm] sm:grid-cols-2 print:grid-cols-2">
            {printable.map((entry) => (
              <div
                key={entry.key}
                className="break-inside-avoid border-[0.2mm] border-dashed border-muted-foreground/60 p-[2mm]"
              >
                <QrCard
                  templateId={templateId}
                  storeName={storeName}
                  entryName={entry.name}
                  url={customerEntryUrl(entry.type, storeSlug, entry.token)}
                  scanHint={scanHint}
                  qrAlt={t('qrAlt')}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
