'use client';

import {
  formatCurrency,
  getBillingPrice,
  getStaffSeatLimit,
  type PlanId,
  toBillingCurrency,
} from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { AsyncAlertDialog } from '@/components/async-alert-dialog';
import { formatStaffDate } from './staff-date';
import { hasAvailableStaffSeat } from './staff-seat';
import { StaffBillingSection, StaffDeviceListSection, StaffPairingSection } from './staff-sections';

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
  timeZone: string;
  currency: string;
};

export function StaffManager({
  storeId,
  plan,
  staffSeatAddons,
  timeZone,
  currency,
}: StaffManagerProps) {
  const t = useTranslations('owner');
  const locale = useLocale();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const [revokeTarget, setRevokeTarget] = useState<Device | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/owner/stores/${storeId}/staff/devices`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        setError(t('staffLoadFailed'));
        return;
      }
      const data = (await response.json()) as { devices: Device[] };
      setDevices(data.devices);
      setError(null);
    } catch {
      setError(t('staffLoadFailed'));
    } finally {
      setIsLoading(false);
    }
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
    setBusyAction(`revoke-${deviceId}`);
    setError(null);
    try {
      const response = await fetch(`/api/owner/stores/${storeId}/staff/devices/${deviceId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(t('revokeFailed'));
      }
      await load();
    } finally {
      setBusyAction(null);
    }
  }

  const activeDeviceCount = devices.filter((device) => device.status === 'active').length;
  const staffSeatLimit = getStaffSeatLimit(plan, seatAddons);
  const hasAvailableSeat = hasAvailableStaffSeat(activeDeviceCount, staffSeatLimit);
  const billingCurrency = toBillingCurrency(currency);
  const seatPrice = formatCurrency(
    getBillingPrice('staff_seat', billingCurrency),
    billingCurrency,
    locale,
  );

  return (
    <div className="space-y-6">
      <StaffPairingSection
        pairingCode={pairingCode}
        copied={copied}
        hasAvailableSeat={hasAvailableSeat}
        isLoading={isLoading}
        busyAction={busyAction}
        onGenerate={() => void generateCode()}
        onCopy={() => void copyCode()}
        timeZone={timeZone}
      />

      {error ? <p className="text-sm font-semibold text-brand-600">{error}</p> : null}
      {billingMessage ? (
        <p className="text-sm font-semibold text-jade-600">{billingMessage}</p>
      ) : null}

      <StaffBillingSection
        isLoading={isLoading}
        activeDeviceCount={activeDeviceCount}
        staffSeatLimit={staffSeatLimit}
        additionalSeats={additionalSeats}
        onAdditionalSeatsChange={setAdditionalSeats}
        billingBusy={billingBusy}
        onBuy={() => void buyAdditionalSeats()}
        seatPrice={seatPrice}
      />

      <StaffDeviceListSection
        devices={devices}
        isLoading={isLoading}
        busyAction={busyAction}
        onRevokeClick={setRevokeTarget}
        timeZone={timeZone}
      />
      <AsyncAlertDialog
        open={revokeTarget !== null}
        title={t('revokeDevice')}
        description={t('revokeConfirm')}
        cancelLabel={t('cancel')}
        confirmLabel={t('revokeDevice')}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        onConfirm={async () => {
          if (!revokeTarget) return;
          await revoke(revokeTarget.id);
        }}
      />
    </div>
  );
}
