'use client';

import { ImageIcon, SparkleIcon, TrashIcon } from '@phosphor-icons/react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { MENU_IMAGE_MAX_BYTES, publicMediaPath } from '@/lib/menu-image';
import { MenuImageEnhancementPanel } from './menu-image-enhancement-panel';

const IMAGE_ERROR_KEYS: Record<string, string> = {
  UNSUPPORTED_TYPE: 'imageErrorUnsupportedType',
  TOO_LARGE: 'imageErrorTooLarge',
  EMPTY: 'imageErrorEmpty',
  BAD_MAGIC: 'imageErrorBadMagic',
};

const MAX_MB = Math.floor(MENU_IMAGE_MAX_BYTES / (1024 * 1024));

type MenuItemImageProps = {
  storeId: string;
  itemId: string;
  imageKey: string | null;
  canUseImageEnhancement: boolean;
  busyAction: string | null;
  onBusyAction: (action: string | null) => void;
  onError: (message: string | null) => void;
  onMessage: (message: string | null) => void;
  onChanged: () => Promise<void>;
};

export function MenuItemImage({
  storeId,
  itemId,
  imageKey,
  canUseImageEnhancement,
  busyAction,
  onBusyAction,
  onError,
  onMessage,
  onChanged,
}: MenuItemImageProps) {
  const t = useTranslations('menu');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEnhancementOpen, setIsEnhancementOpen] = useState(false);
  const [enhancement, setEnhancement] = useState<{
    id: string;
    status: 'queued' | 'processing' | 'needs_review' | 'applied' | 'failed' | 'cancelled';
    sourceImageUrl: string;
    previewImageUrl: string | null;
    errorCode: string | null;
  } | null>(null);
  const [usage, setUsage] = useState({ used: 0, limit: 10 });

  const loadEnhancement = useCallback(async () => {
    const response = await fetch(
      `/api/owner/stores/${storeId}/menu/items/${itemId}/image-enhancements`,
      { cache: 'no-store' },
    );
    if (!response.ok) {
      onError(t('photoEnhanceLoadFailed'));
      return;
    }
    const data = (await response.json()) as {
      job: typeof enhancement;
      usage: { used: number; limit: number };
    };
    setEnhancement(data.job);
    setUsage(data.usage);
  }, [itemId, onError, storeId, t]);

  useEffect(() => {
    if (!isEnhancementOpen || !canUseImageEnhancement) return;
    void loadEnhancement();
  }, [canUseImageEnhancement, isEnhancementOpen, loadEnhancement]);

  useEffect(() => {
    if (
      !isEnhancementOpen ||
      (enhancement?.status !== 'queued' && enhancement?.status !== 'processing')
    ) {
      return;
    }
    const timer = window.setInterval(() => void loadEnhancement(), 4000);
    return () => window.clearInterval(timer);
  }, [enhancement?.status, isEnhancementOpen, loadEnhancement]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    onBusyAction(`upload-${itemId}`);
    onError(null);
    onMessage(null);
    try {
      const body = new FormData();
      body.set('file', file);
      const res = await fetch(`/api/owner/stores/${storeId}/menu/items/${itemId}/image`, {
        method: 'POST',
        body,
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        const key = data?.error ? IMAGE_ERROR_KEYS[data.error] : undefined;
        onError(key ? t(key, { maxMb: MAX_MB }) : t('uploadFailed'));
        return;
      }
      await onChanged();
      onMessage(t('uploadDone'));
    } finally {
      onBusyAction(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleRemove() {
    onBusyAction(`remove-${itemId}`);
    onError(null);
    onMessage(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/menu/items/${itemId}/image`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        onError(t('removeImageFailed'));
        return;
      }
      await onChanged();
      onMessage(t('removeImageDone'));
    } finally {
      onBusyAction(null);
    }
  }

  function enhancementError(code?: string) {
    if (code === 'MONTHLY_LIMIT_REACHED') return t('photoEnhanceMonthlyLimitReached');
    if (code === 'SOURCE_IMAGE_CHANGED') return t('photoEnhanceSourceChanged');
    return t('photoEnhanceFailed');
  }

  async function handleEnhance() {
    if (!canUseImageEnhancement) {
      onError(t('photoEnhanceProHint'));
      return;
    }
    setIsEnhancementOpen(true);
    onBusyAction(`enhance-${itemId}`);
    onError(null);
    try {
      const response = await fetch(
        `/api/owner/stores/${storeId}/menu/items/${itemId}/image-enhancements`,
        { method: 'POST' },
      );
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        onError(enhancementError(data?.error));
        return;
      }
      await loadEnhancement();
    } finally {
      onBusyAction(null);
    }
  }

  async function handleEnhancementAction(action: 'apply' | 'cancel' | 'restore') {
    if (!enhancement) return;
    onBusyAction(`${action}-${itemId}`);
    onError(null);
    try {
      const response = await fetch(
        `/api/owner/stores/${storeId}/menu/items/${itemId}/image-enhancements/${enhancement.id}/${action}`,
        { method: 'POST' },
      );
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        onError(enhancementError(data?.error));
        return;
      }
      await onChanged();
      await loadEnhancement();
      onMessage(t(action === 'apply' ? 'photoEnhanceApplied' : 'photoEnhanceOriginalKept'));
      if (action !== 'apply') setIsEnhancementOpen(false);
    } finally {
      onBusyAction(null);
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        {imageKey ? (
          <Image
            src={publicMediaPath(imageKey)}
            alt=""
            width={44}
            height={44}
            unoptimized
            className="size-11 rounded-lg border border-border object-cover"
          />
        ) : (
          <div className="flex size-11 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
            <ImageIcon className="size-4" weight="bold" aria-hidden />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="icon-xl"
          pending={busyAction === `upload-${itemId}`}
          busy={busyAction !== null}
          iconOnly
          title={t('image')}
          aria-label={t('uploadImage')}
          onClick={() => inputRef.current?.click()}
        >
          <ImageIcon className="size-4" weight="bold" aria-hidden />
        </Button>
        {imageKey ? (
          <Button
            type="button"
            variant="outline"
            size="icon-xl"
            pending={busyAction === `enhance-${itemId}`}
            busy={busyAction !== null}
            iconOnly
            title={t('photoEnhanceButton')}
            aria-label={t('photoEnhanceButton')}
            onClick={() => {
              if (canUseImageEnhancement) {
                setIsEnhancementOpen((current) => !current);
              } else {
                void handleEnhance();
              }
            }}
            className="text-indigo-700"
          >
            <SparkleIcon className="size-4" weight="fill" aria-hidden />
          </Button>
        ) : null}
        {imageKey ? (
          <Button
            type="button"
            variant="outline"
            size="icon-xl"
            pending={busyAction === `remove-${itemId}`}
            busy={busyAction !== null}
            iconOnly
            title={t('removeImage')}
            aria-label={t('removeImage')}
            onClick={() => void handleRemove()}
            className="text-brand-600"
          >
            <TrashIcon className="size-4" weight="bold" aria-hidden />
          </Button>
        ) : null}
      </div>

      <MenuImageEnhancementPanel
        imageKey={imageKey}
        isOpen={isEnhancementOpen}
        canUseImageEnhancement={canUseImageEnhancement}
        enhancement={enhancement}
        usage={usage}
        busyAction={busyAction}
        itemId={itemId}
        onClose={() => setIsEnhancementOpen(false)}
        onEnhance={() => void handleEnhance()}
        onAction={(action) => void handleEnhancementAction(action)}
      />
    </div>
  );
}
