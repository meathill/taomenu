'use client';

import {
  CopyIcon,
  DeviceMobileIcon,
  LockSimpleIcon,
  ShieldCheckIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { getStaffSeatLimit, type PlanId } from '@taomenu/shared';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/button';
import { QrImage } from '../tables/qr-image';

type Device = {
  id: string;
  name: string;
  pairedAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  status: 'active' | 'revoked';
  pushEnabled: boolean;
};

type StaffManagerProps = {
  storeId: string;
  plan: PlanId;
  staffSeatAddons: number;
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function StaffManager({ storeId, plan, staffSeatAddons }: StaffManagerProps) {
  const t = useTranslations('owner');
  const [devices, setDevices] = useState<Device[]>([]);
  const [pairingCode, setPairingCode] = useState<{
    code: string;
    expiresAt: string;
    url: string;
  } | null>(null);
  const [seatAddons, setSeatAddons] = useState(staffSeatAddons);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [additionalSeats, setAdditionalSeats] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/owner/stores/${storeId}/staff/devices`);
    if (!response.ok) {
      setError(t('staffLoadFailed'));
      return;
    }
    const data = (await response.json()) as { devices: Device[] };
    setDevices(data.devices);
  }, [storeId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function generateCode() {
    setBusyAction('generate');
    setError(null);
    setCopied(false);
    try {
      const response = await fetch(`/api/owner/stores/${storeId}/staff/pairing-code`, {
        method: 'POST',
      });
      const data = (await response.json()) as {
        code?: string;
        expiresAt?: string;
        error?: string;
      };
      if (!response.ok || !data.code || !data.expiresAt) {
        setError(data.error === 'TERMINAL_LIMIT' ? t('staffSeatLimit') : t('pairCodeFailed'));
        return;
      }
      setPairingCode({
        code: data.code,
        expiresAt: data.expiresAt,
        url: new URL(
          `/terminal/pair?code=${encodeURIComponent(data.code)}`,
          window.location.origin,
        ).toString(),
      });
    } finally {
      setBusyAction(null);
    }
  }

  async function copyCode() {
    if (!pairingCode) return;
    await navigator.clipboard.writeText(pairingCode.code);
    setCopied(true);
  }

  async function buyAdditionalSeats() {
    setBillingBusy(true);
    setError(null);
    setBillingMessage(null);
    try {
      const response = await fetch(`/api/owner/stores/${storeId}/billing/staff-seats/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: additionalSeats }),
      });
      const data = (await response.json().catch(() => null)) as {
        url?: string;
        updated?: boolean;
        staffSeatAddons?: number;
        error?: string;
      } | null;
      if (!response.ok) {
        setError(
          data?.error === 'BILLING_NOT_CONFIGURED'
            ? t('billingNotConfigured')
            : data?.error === 'BILLING_SYNC_PENDING'
              ? t('billingSyncPending')
              : t('billingFailed'),
        );
        return;
      }
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      if (data?.updated && typeof data.staffSeatAddons === 'number') {
        setSeatAddons(data.staffSeatAddons);
        setBillingMessage(t('billingUpdated'));
      }
    } finally {
      setBillingBusy(false);
    }
  }

  async function revoke(deviceId: string) {
    if (!window.confirm(t('revokeConfirm'))) return;
    setBusyAction(`revoke-${deviceId}`);
    setError(null);
    try {
      const response = await fetch(`/api/owner/stores/${storeId}/staff/devices/${deviceId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        setError(t('revokeFailed'));
        return;
      }
      await load();
    } finally {
      setBusyAction(null);
    }
  }

  const activeDeviceCount = devices.filter((device) => device.status === 'active').length;
  const staffSeatLimit = getStaffSeatLimit(plan, seatAddons);

  return (
    <div className="space-y-6">
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
            pending={busyAction === 'generate'}
            busy={busyAction !== null}
            onClick={() => void generateCode()}
            className="min-h-12 shrink-0 rounded-xl bg-jade-600 px-4 text-sm font-bold text-white"
          >
            {t('generatePairingCode')}
          </Button>
        </div>
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
                <Button
                  type="button"
                  onClick={() => void copyCode()}
                  className="min-h-11 rounded-xl border border-border px-3 text-sm font-bold text-ink-900"
                >
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
                {t('pairCodeExpiry', { time: formatDate(pairingCode.expiresAt) })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{t('pairCodeInstruction')}</p>
            </div>
          </div>
        ) : null}
      </section>

      {error ? <p className="text-sm font-semibold text-brand-600">{error}</p> : null}
      {billingMessage ? (
        <p className="text-sm font-semibold text-jade-600">{billingMessage}</p>
      ) : null}

      <section className="rounded-2xl border border-border bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-ink-900">{t('staffSeatsTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('staffSeatUsage', { used: activeDeviceCount, total: staffSeatLimit })}
            </p>
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
                  setAdditionalSeats(Math.min(20, Math.max(1, Number(event.target.value) || 1)))
                }
                className="mt-1.5 min-h-11 w-full rounded-xl border border-border px-3 text-base outline-none ring-jade-600 focus:ring-2 sm:w-24"
              />
            </label>
            <Button
              type="button"
              pending={billingBusy}
              onClick={() => void buyAdditionalSeats()}
              className="min-h-11 rounded-xl bg-gold-600 px-4 text-sm font-bold text-white"
            >
              <LockSimpleIcon className="size-4" />
              {t('buyStaffSeats')}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="devices-title">
        <div>
          <h2 id="devices-title" className="text-lg font-black text-ink-900">
            {t('devicesTitle')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('devicesSubtitle')}</p>
        </div>
        {devices.length === 0 ? (
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
                      {t('lastSeen', { time: formatDate(device.lastSeenAt) })}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {device.pushEnabled ? t('pushReady') : t('pushNotReady')}
                    </p>
                  </div>
                </div>
                {device.status === 'active' ? (
                  <Button
                    type="button"
                    pending={busyAction === `revoke-${device.id}`}
                    busy={busyAction !== null}
                    onClick={() => void revoke(device.id)}
                    className="min-h-11 rounded-xl border border-brand-600 px-3 text-xs font-bold text-brand-600"
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
    </div>
  );
}
