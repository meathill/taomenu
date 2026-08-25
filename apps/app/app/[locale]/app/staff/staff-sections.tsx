'use client';

import { CopyIcon, DeviceMobileIcon, ShieldCheckIcon, TrashIcon } from '@phosphor-icons/react';
import { formatCurrency } from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/button';
import { QrImage } from '@/components/qr-image';
import { fieldClassName } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { formatStaffDate } from './staff-date';

type PairingCode = { code: string; expiresAt: string; url: string } | null;

type Device = {
  id: string;
  name: string;
  pairedAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  status: 'active' | 'revoked';
  pushEnabled: boolean;
};

export function StaffPairingSection({
  pairingCode,
  copied,
  hasAvailableSeat,
  isLoading,
  busyAction,
  onGenerate,
  onCopy,
  timeZone,
}: {
  pairingCode: PairingCode;
  copied: boolean;
  hasAvailableSeat: boolean;
  isLoading: boolean;
  busyAction: string | null;
  onGenerate: () => void;
  onCopy: () => void;
  timeZone: string;
}) {
  const t = useTranslations('owner');
  const locale = useLocale();
  return (
    <section className="rounded-2xl border border-jade-600 bg-jade-50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="size-6 text-jade-600" weight="duotone" />
            <h2 className="text-lg font-black text-ink-900">{t('pairTitle')}</h2>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {t('pairDescription')}
          </p>
        </div>
        <Button
          type="button"
          variant="default"
          size="lg"
          pending={busyAction === 'generate'}
          busy={isLoading || busyAction !== null}
          disabled={!isLoading && !hasAvailableSeat}
          onClick={onGenerate}
          className="shrink-0"
        >
          {t('generatePairingCode')}
        </Button>
      </div>
      {!isLoading && !hasAvailableSeat ? (
        <p className="mt-3 text-sm font-semibold text-brand-700" role="note">
          {t('staffSeatFullHint')}
        </p>
      ) : null}
      {pairingCode ? (
        <div className="mt-5 grid gap-5 rounded-xl border border-jade-600 bg-white p-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center">
          <div className="mx-auto rounded-xl border border-border bg-white p-2">
            <QrImage url={pairingCode.url} alt={t('pairQrAlt')} width={360} className="size-44" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t('pairCodeLabel')}
            </p>
            <p className="mt-2 font-mono text-3xl font-black tracking-[0.18em] text-ink-900">
              {pairingCode.code}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={onCopy}>
                <CopyIcon className="size-4" />
                {copied ? t('copied') : t('copyCode')}
              </Button>
              <a
                href={pairingCode.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center rounded-xl border border-border px-3 text-sm font-bold text-ink-900"
              >
                {t('openPairingPage')}
              </a>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('pairCodeExpiry', {
                time: formatStaffDate(pairingCode.expiresAt, locale, timeZone),
              })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t('pairCodeInstruction')}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function StaffBillingSection({
  isLoading,
  activeDeviceCount,
  staffSeatLimit,
  additionalSeats,
  onAdditionalSeatsChange,
  billingBusy,
  onBuy,
  seatPrice,
}: {
  isLoading: boolean;
  activeDeviceCount: number;
  staffSeatLimit: number;
  additionalSeats: number;
  onAdditionalSeatsChange: (n: number) => void;
  billingBusy: boolean;
  onBuy: () => void;
  seatPrice: string;
}) {
  const t = useTranslations('owner');
  return (
    <section className="rounded-2xl border border-border bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-ink-900">{t('staffSeatsTitle')}</h2>
          {isLoading ? (
            <Skeleton
              className="mt-2 h-4 w-48"
              aria-label={t('loadingStaff')}
              aria-busy="true"
              role="status"
            />
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              {t('staffSeatUsage', { used: activeDeviceCount, total: staffSeatLimit })}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="text-xs font-bold text-ink-900">
            {t('additionalStaffSeats')}
            <input
              type="number"
              min={1}
              max={20}
              value={additionalSeats}
              onChange={(event) =>
                onAdditionalSeatsChange(Math.min(20, Math.max(1, Number(event.target.value) || 1)))
              }
              className={`mt-1.5 sm:w-24 ${fieldClassName}`}
            />
          </label>
          <Button
            type="button"
            pending={billingBusy}
            busy={isLoading}
            onClick={onBuy}
            className="min-h-11 rounded-xl bg-gold-600 px-4 text-sm font-bold text-white"
          >
            {t('buyStaffSeats')}
          </Button>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        {t('seatPriceHint', { price: seatPrice })}
      </p>
    </section>
  );
}

export function StaffDeviceListSection({
  devices,
  isLoading,
  busyAction,
  onRevokeClick,
  timeZone,
}: {
  devices: Device[];
  isLoading: boolean;
  busyAction: string | null;
  onRevokeClick: (d: Device) => void;
  timeZone: string;
}) {
  const t = useTranslations('owner');
  const locale = useLocale();
  return (
    <section className="space-y-3" aria-labelledby="devices-title">
      <div>
        <h2 id="devices-title" className="text-lg font-black text-ink-900">
          {t('devicesTitle')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('devicesSubtitle')}</p>
      </div>
      {isLoading ? (
        <div
          role="status"
          className="divide-y divide-border rounded-2xl border border-border bg-white"
          aria-label={t('loadingStaff')}
          aria-busy="true"
        >
          <div className="flex items-center justify-between gap-3 p-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-7 w-16" />
          </div>
          <div className="flex items-center justify-between gap-3 p-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-7 w-16" />
          </div>
        </div>
      ) : devices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white p-5 text-sm text-muted-foreground">
          {t('noDevices')}
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
          {devices.map((device) => (
            <li
              key={device.id}
              className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper-50 text-jade-600">
                  <DeviceMobileIcon className="size-5" weight="duotone" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink-900">{device.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {device.status === 'active' ? t('deviceActive') : t('deviceRevoked')} ·{' '}
                    {t('lastSeen', {
                      time: formatStaffDate(device.lastSeenAt, locale, timeZone),
                    })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {device.pushEnabled ? t('pushReady') : t('pushNotReady')}
                  </p>
                </div>
              </div>
              {device.status === 'active' ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  busy={busyAction !== null}
                  onClick={() => onRevokeClick(device)}
                  className="text-brand-600"
                >
                  <TrashIcon className="size-4" />
                  {t('revokeDevice')}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
