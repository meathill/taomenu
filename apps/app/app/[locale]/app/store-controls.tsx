'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/button';

type StoreControlsProps = {
  storeId: string;
  acceptingPublicRequests: boolean;
  isReady: boolean;
};

export function StoreControls({ storeId, acceptingPublicRequests, isReady }: StoreControlsProps) {
  const t = useTranslations('owner');
  const [accepting, setAccepting] = useState(acceptingPublicRequests);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    const next = !accepting;
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/order-intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptingPublicRequests: next }),
      });
      if (!res.ok) {
        setError(t('errorUpdate'));
        return;
      }
      setAccepting(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink-900">{t('publicOrders')}</p>
          <p className="text-xs text-muted-foreground">
            {!isReady
              ? t('publicOrdersNotReady')
              : accepting
                ? t('publicOrdersOpen')
                : t('publicOrdersPaused')}
          </p>
        </div>
        <Button
          type="button"
          pending={busy}
          disabled={!isReady && !accepting}
          onClick={() => void toggle()}
          className={
            accepting
              ? 'min-h-11 shrink-0 rounded-xl border border-brand-600 px-3 text-xs font-bold text-brand-600'
              : 'min-h-11 shrink-0 rounded-xl bg-jade-600 px-3 text-xs font-bold text-white'
          }
        >
          {accepting ? t('pause') : t('resume')}
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs text-brand-600">{error}</p> : null}
    </div>
  );
}
