'use client';

import type { StoreRow } from '@taomenu/db';
import { hasProEntitlements } from '@taomenu/shared';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { HiddenFileInput } from '@/components/hidden-file-input';
import { usePaywall } from '@/components/paywall/paywall-provider';
import { ProBadge } from '@/components/paywall/pro-badge';
import { Switch } from '@/components/ui/switch';
import { publicMediaPath } from '@/lib/menu-image';
import {
  deleteStoreCover,
  imageErrorKey,
  MENU_IMAGE_MAX_MB,
  prepareAndUploadStoreCover,
} from '@/lib/menu-image-upload';
import { MENU_IMAGE_ACCEPT } from '@/lib/prepare-menu-image';

type StoreBrandingSectionProps = {
  store: StoreRow;
  initialHidePoweredBy: boolean;
  initialCoverImageKey: string | null;
};

/** 顾客菜单封面（Free）+「Powered by TaoMenu」开关（Pro） */
export function StoreBrandingSection({
  store,
  initialHidePoweredBy,
  initialCoverImageKey,
}: StoreBrandingSectionProps) {
  const t = useTranslations('owner');
  const tMenu = useTranslations('menu');
  const { openPaywall } = usePaywall();
  const switchId = useId();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const isPro = hasProEntitlements(store.plan);
  const [hidePoweredBy, setHidePoweredBy] = useState(isPro && initialHidePoweredBy);
  const [coverImageKey, setCoverImageKey] = useState(initialCoverImageKey);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  function coverErrorText(code?: string) {
    const key = imageErrorKey(code);
    if (key) return tMenu(key, { maxMb: MENU_IMAGE_MAX_MB });
    return code === 'NOT_MIGRATED' ? t('brandingNotReady') : t('brandingSaveFailed');
  }

  async function handleCoverPicked(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await prepareAndUploadStoreCover(store.id, file);
      if (!result.ok) {
        setStatus({ tone: 'error', text: coverErrorText(result.error) });
        return;
      }
      setCoverImageKey(result.coverImageKey);
      setStatus({ tone: 'ok', text: t('coverPhotoAdded') });
    } catch {
      setStatus({ tone: 'error', text: t('brandingSaveFailed') });
    } finally {
      setBusy(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  }

  async function handleRemoveCover() {
    setBusy(true);
    setStatus(null);
    try {
      const result = await deleteStoreCover(store.id);
      if (!result.ok) {
        setStatus({ tone: 'error', text: coverErrorText(result.error) });
        return;
      }
      setCoverImageKey(null);
      setStatus({ tone: 'ok', text: t('coverPhotoRemoved') });
    } catch {
      setStatus({ tone: 'error', text: t('brandingSaveFailed') });
    } finally {
      setBusy(false);
    }
  }

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

      <div className="mt-4">
        <p className="text-sm font-semibold text-ink-900">{t('coverPhoto')}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('coverPhotoHint')}</p>
        {coverImageKey ? (
          <div className="mt-3 overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={publicMediaPath(coverImageKey)} alt="" className="h-32 w-full object-cover" />
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => coverInputRef.current?.click()}>
            {coverImageKey ? t('coverPhotoChange') : t('coverPhotoAdd')}
          </Button>
          {coverImageKey ? (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => void handleRemoveCover()}
            >
              {t('coverPhotoRemove')}
            </Button>
          ) : null}
        </div>
        <HiddenFileInput
          ref={coverInputRef}
          accept={MENU_IMAGE_ACCEPT}
          onChange={(event) => void handleCoverPicked(event.target.files?.[0])}
        />
      </div>

      <label
        htmlFor={switchId}
        className="mt-5 flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-ink-900"
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
        >
          {status.text}
        </p>
      ) : null}
    </section>
  );
}
