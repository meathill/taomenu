'use client';

import type { StoreRow } from '@taomenu/db';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { usePaywall } from '@/components/paywall/paywall-provider';
import { ProBadge } from '@/components/paywall/pro-badge';
import { Switch } from '@/components/ui/switch';

type StoreBrandingSectionProps = {
  store: StoreRow;
  initialHidePoweredBy: boolean;
};

/** issue #26：顾客点单页的「Powered by TaoMenu」开关；Pro 即时保存，Free 打开付费墙 */
export function StoreBrandingSection({ store, initialHidePoweredBy }: StoreBrandingSectionProps) {
  const t = useTranslations('owner');
  const { openPaywall } = usePaywall();
  const switchId = useId();
  const isPro = store.plan === 'pro';
  const [hidePoweredBy, setHidePoweredBy] = useState(isPro && initialHidePoweredBy);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  async function handleCheckedChange(checked: boolean) {
    if (!isPro) {
      openPaywall('removePoweredBy');
      return;
    }
    setBusy(true);
    setStatus(null);
    setHidePoweredBy(checked);
    try {
      const response = await fetch(`/api/owner/stores/${store.id}/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidePoweredBy: checked }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setHidePoweredBy(!checked);
        setStatus({
          tone: 'error',
          text: data?.error === 'NOT_MIGRATED' ? t('brandingNotReady') : t('brandingSaveFailed'),
        });
        return;
      }
      setStatus({ tone: 'ok', text: t('brandingSaved') });
    } catch {
      setHidePoweredBy(!checked);
      setStatus({ tone: 'error', text: t('brandingSaveFailed') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-5">
      <h2 className="text-lg font-black text-ink-900">{t('brandingTitle')}</h2>
      <label
        htmlFor={switchId}
        className="mt-4 flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-ink-900"
      >
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          {t('hidePoweredBy')}
          {isPro ? null : <ProBadge />}
        </span>
        <Switch
          id={switchId}
          checked={hidePoweredBy}
          disabled={busy}
          onCheckedChange={(checked) => void handleCheckedChange(checked)}
        />
      </label>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {isPro ? t('hidePoweredByHint') : t('hidePoweredByFreeHint')}
      </p>
      {status ? (
        <p
          className={`mt-2 text-xs font-semibold ${status.tone === 'ok' ? 'text-jade-600' : 'text-brand-600'}`}
          role="status"
        >
          {status.text}
        </p>
      ) : null}
    </section>
  );
}
