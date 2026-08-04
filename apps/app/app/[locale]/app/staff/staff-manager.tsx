'use client';

import { CopyIcon, DeviceMobileIcon, ShieldCheckIcon, TrashIcon } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/button';

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
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function StaffManager({ storeId }: StaffManagerProps) {
  const t = useTranslations('owner');
  const [devices, setDevices] = useState<Device[]>([]);
  const [pairingCode, setPairingCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setBusy(true);
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
        setError(data.error || t('pairCodeFailed'));
        return;
      }
      setPairingCode({ code: data.code, expiresAt: data.expiresAt });
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!pairingCode) return;
    await navigator.clipboard.writeText(pairingCode.code);
    setCopied(true);
  }

  async function revoke(deviceId: string) {
    if (!window.confirm(t('revokeConfirm'))) return;
    setBusy(true);
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
      setBusy(false);
    }
  }

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
            pending={busy}
            onClick={() => void generateCode()}
            className="min-h-12 shrink-0 rounded-xl bg-jade-600 px-4 text-sm font-bold text-white"
          >
            {t('generatePairingCode')}
          </Button>
        </div>
        {pairingCode ? (
          <div className="mt-5 rounded-xl border border-jade-600 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t('pairCodeLabel')}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="font-mono text-3xl font-black tracking-[0.18em] text-ink-900">
                {pairingCode.code}
              </p>
              <Button
                type="button"
                onClick={() => void copyCode()}
                className="min-h-11 rounded-xl border border-border px-3 text-sm font-bold text-ink-900"
              >
                <CopyIcon className="size-4" />
                {copied ? t('copied') : t('copyCode')}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('pairCodeExpiry', { time: formatDate(pairingCode.expiresAt) })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t('pairCodeInstruction')}</p>
          </div>
        ) : null}
      </section>

      {error ? <p className="text-sm font-semibold text-brand-600">{error}</p> : null}

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
                    pending={busy}
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
