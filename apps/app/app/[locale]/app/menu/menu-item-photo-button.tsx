'use client';

import { ImageIcon } from '@phosphor-icons/react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { HiddenFileInput } from '@/components/hidden-file-input';
import { publicMediaPath } from '@/lib/menu-image';
import {
  imageErrorKey,
  MENU_IMAGE_MAX_MB,
  prepareAndUploadMenuItemImage,
} from '@/lib/menu-image-upload';
import { MENU_IMAGE_ACCEPT } from '@/lib/prepare-menu-image';

type MenuItemPhotoButtonProps = {
  storeId: string;
  itemId: string;
  imageKey: string | null;
  disabled: boolean;
  pending: boolean;
  onBusy: (action: string | null) => void;
  onError: (message: string | null) => void;
  onMessage: (message: string | null) => void;
  onChanged: () => Promise<void>;
};

/** 菜单列表上一键添加/更换菜品照片 */
export function MenuItemPhotoButton({
  storeId,
  itemId,
  imageKey,
  disabled,
  pending,
  onBusy,
  onError,
  onMessage,
  onChanged,
}: MenuItemPhotoButtonProps) {
  const t = useTranslations('menu');
  const inputRef = useRef<HTMLInputElement>(null);
  const label = imageKey ? t('changePhoto') : t('addPhoto');

  async function handleFile(file: File | undefined) {
    if (!file) return;
    onBusy(`upload-${itemId}`);
    onError(null);
    onMessage(null);
    try {
      const result = await prepareAndUploadMenuItemImage(storeId, itemId, file);
      if (!result.ok) {
        const key = imageErrorKey(result.error);
        onError(key ? t(key, { maxMb: MENU_IMAGE_MAX_MB }) : t('uploadFailed'));
        return;
      }
      await onChanged();
      onMessage(t('uploadDone'));
    } finally {
      onBusy(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <>
      <HiddenFileInput
        ref={inputRef}
        accept={MENU_IMAGE_ACCEPT}
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() => inputRef.current?.click()}
        aria-label={label}
        title={label}
        className="shrink-0 rounded-xl text-left disabled:opacity-50"
      >
        {imageKey ? (
          <Image
            src={publicMediaPath(imageKey)}
            alt=""
            width={48}
            height={48}
            unoptimized
            className="size-12 rounded-xl border border-border object-cover"
          />
        ) : (
          <span className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-dashed border-ink-900 bg-paper-50 px-2.5 text-xs font-bold text-ink-900">
            <ImageIcon className="size-4 shrink-0" weight="bold" aria-hidden />
            {t('addPhoto')}
          </span>
        )}
      </button>
    </>
  );
}
