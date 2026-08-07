'use client';

import { ImageIcon, TrashIcon } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { Button } from '@/components/button';
import { MENU_IMAGE_MAX_BYTES, publicMediaPath } from '@/lib/menu-image';

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
  busyAction: string | null;
  onBusyAction: (action: string | null) => void;
  onError: (message: string | null) => void;
  onChanged: () => Promise<void>;
};

export function MenuItemImage({
  storeId,
  itemId,
  imageKey,
  busyAction,
  onBusyAction,
  onError,
  onChanged,
}: MenuItemImageProps) {
  const t = useTranslations('menu');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    onBusyAction(`upload-${itemId}`);
    onError(null);
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
    } finally {
      onBusyAction(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleRemove() {
    onBusyAction(`remove-${itemId}`);
    onError(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/menu/items/${itemId}/image`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        onError(t('removeImageFailed'));
        return;
      }
      await onChanged();
    } finally {
      onBusyAction(null);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {imageKey ? (
        <img
          src={publicMediaPath(imageKey)}
          alt=""
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
        pending={busyAction === `upload-${itemId}`}
        busy={busyAction !== null}
        iconOnly
        title={t('image')}
        aria-label={t('uploadImage')}
        onClick={() => inputRef.current?.click()}
        className="size-11 rounded-xl border border-border text-ink-900"
      >
        <ImageIcon className="size-4" weight="bold" aria-hidden />
      </Button>
      {imageKey ? (
        <Button
          type="button"
          pending={busyAction === `remove-${itemId}`}
          busy={busyAction !== null}
          iconOnly
          title={t('removeImage')}
          aria-label={t('removeImage')}
          onClick={() => void handleRemove()}
          className="size-11 rounded-xl border border-border text-brand-600"
        >
          <TrashIcon className="size-4" weight="bold" aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}
