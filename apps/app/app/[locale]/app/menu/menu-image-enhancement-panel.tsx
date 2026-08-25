'use client';

import { ArrowCounterClockwiseIcon, CheckIcon, XIcon } from '@phosphor-icons/react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/button';

type Enhancement = {
  id: string;
  status: 'queued' | 'processing' | 'needs_review' | 'applied' | 'failed' | 'cancelled';
  sourceImageUrl: string;
  previewImageUrl: string | null;
  errorCode: string | null;
};

type Props = {
  imageKey: string | null;
  isOpen: boolean;
  canUseImageEnhancement: boolean;
  enhancement: Enhancement | null;
  usage: { used: number; limit: number };
  busyAction: string | null;
  itemId: string;
  onClose: () => void;
  onEnhance: () => void;
  onAction: (action: 'apply' | 'cancel' | 'restore') => void;
};

function enhancementError(code: string | undefined, t: ReturnType<typeof useTranslations<'menu'>>) {
  if (code === 'MONTHLY_LIMIT_REACHED') return t('photoEnhanceMonthlyLimitReached');
  if (code === 'SOURCE_IMAGE_CHANGED') return t('photoEnhanceSourceChanged');
  return t('photoEnhanceFailed');
}

export function MenuImageEnhancementPanel({
  imageKey,
  isOpen,
  canUseImageEnhancement,
  enhancement,
  usage,
  busyAction,
  itemId,
  onClose,
  onEnhance,
  onAction,
}: Props) {
  const t = useTranslations('menu');
  if (!imageKey || !isOpen || !canUseImageEnhancement) return null;
  return (
    <div className="mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-black text-ink-900">{t('photoEnhance')}</p>
          <p className="mt-0.5 text-muted-foreground">{t('photoEnhanceMonthlyUsage', usage)}</p>
        </div>
        <button
          type="button"
          aria-label={t('close')}
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
        >
          <XIcon className="size-4" aria-hidden />
        </button>
      </div>

      {!enhancement || ['failed', 'cancelled'].includes(enhancement.status) ? (
        <div className="mt-3">
          {enhancement?.status === 'failed' ? (
            <p className="mb-2 font-semibold text-brand-600">
              {enhancementError(enhancement.errorCode ?? undefined, t)}
            </p>
          ) : null}
          <Button
            type="button"
            pending={busyAction === `enhance-${itemId}`}
            busy={busyAction !== null}
            disabled={usage.used >= usage.limit}
            onClick={onEnhance}
            className="min-h-10 w-full rounded-lg bg-indigo-600 px-3 font-bold text-white"
          >
            {t('photoEnhanceCreate')}
          </Button>
        </div>
      ) : null}

      {enhancement?.status === 'queued' || enhancement?.status === 'processing' ? (
        <p className="mt-3 font-semibold text-indigo-700" role="status">
          {t('photoEnhanceProcessing')}
        </p>
      ) : null}

      {enhancement?.status === 'needs_review' && enhancement.previewImageUrl ? (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <figure>
              <Image
                src={enhancement.sourceImageUrl}
                alt={t('photoEnhanceOriginal')}
                width={128}
                height={128}
                unoptimized
                className="aspect-square w-full rounded-lg object-cover"
              />
              <figcaption className="mt-1 font-semibold">{t('photoEnhanceOriginal')}</figcaption>
            </figure>
            <figure>
              <Image
                src={enhancement.previewImageUrl}
                alt={t('photoEnhancePreview')}
                width={128}
                height={128}
                unoptimized
                className="aspect-square w-full rounded-lg object-cover"
              />
              <figcaption className="mt-1 font-semibold">{t('photoEnhancePreview')}</figcaption>
            </figure>
          </div>
          <p className="leading-5 text-muted-foreground">{t('photoEnhanceReviewHint')}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              busy={busyAction !== null}
              onClick={() => onAction('cancel')}
              className="min-h-10 flex-1 rounded-lg border border-border bg-white px-2 font-bold"
            >
              <XIcon className="mr-1 size-4" aria-hidden />
              {t('photoEnhanceKeepOriginal')}
            </Button>
            <Button
              type="button"
              busy={busyAction !== null}
              onClick={() => onAction('apply')}
              className="min-h-10 flex-1 rounded-lg bg-indigo-600 px-2 font-bold text-white"
            >
              <CheckIcon className="mr-1 size-4" aria-hidden />
              {t('photoEnhanceUsePreview')}
            </Button>
          </div>
        </div>
      ) : null}

      {enhancement?.status === 'applied' ? (
        <div className="mt-3">
          <p className="font-semibold text-indigo-700">{t('photoEnhanceInUse')}</p>
          <Button
            type="button"
            busy={busyAction !== null}
            onClick={() => onAction('restore')}
            className="mt-2 min-h-10 w-full rounded-lg border border-border bg-white px-3 font-bold"
          >
            <ArrowCounterClockwiseIcon className="mr-1 size-4" aria-hidden />
            {t('photoEnhanceRestore')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
