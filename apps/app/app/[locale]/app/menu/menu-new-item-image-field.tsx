'use client';

import { ImageIcon, XIcon } from '@phosphor-icons/react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { HiddenFileInput } from '@/components/hidden-file-input';
import { IMAGE_ERROR_KEYS, MENU_IMAGE_MAX_MB } from '@/lib/menu-image-upload';
import { MENU_IMAGE_ACCEPT, prepareMenuImageFile } from '@/lib/prepare-menu-image';

type MenuNewItemImageFieldProps = {
  file: File | null;
  disabled: boolean;
  onFileChange: (file: File | null) => void;
};

/** 新增菜品时可选的照片：先暂存在本地，菜品创建成功后再上传 */
export function MenuNewItemImageField({
  file,
  disabled,
  onFileChange,
}: MenuNewItemImageFieldProps) {
  const t = useTranslations('menu');
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const [isPreparing, setIsPreparing] = useState(false);

  async function handleSelect(selected: File | undefined) {
    if (inputRef.current) inputRef.current.value = '';
    if (!selected) return;
    setIsPreparing(true);
    setError(null);
    try {
      const prepared = await prepareMenuImageFile(selected);
      if (!prepared.ok) {
        setError(t(IMAGE_ERROR_KEYS[prepared.error], { maxMb: MENU_IMAGE_MAX_MB }));
        return;
      }
      onFileChange(prepared.file);
    } finally {
      setIsPreparing(false);
    }
  }

  return (
    <div>
      <span className="text-sm font-bold text-ink-900">{t('newItemPhoto')}</span>
      <div className="mt-1 flex items-center gap-2">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt=""
            width={56}
            height={56}
            unoptimized
            className="size-14 rounded-lg border border-border object-cover"
          />
        ) : (
          <div className="flex size-14 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
            <ImageIcon className="size-5" weight="bold" aria-hidden />
          </div>
        )}
        <HiddenFileInput
          ref={inputRef}
          accept={MENU_IMAGE_ACCEPT}
          onChange={(event) => handleSelect(event.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isPreparing}
          pending={isPreparing}
          onClick={() => inputRef.current?.click()}
        >
          <ImageIcon className="size-4" weight="bold" aria-hidden />
          {file ? t('changePhoto') : t('choosePhoto')}
        </Button>
        {file ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onFileChange(null)}
            aria-label={t('removeImage')}
          >
            <XIcon className="size-4" weight="bold" aria-hidden />
          </Button>
        ) : null}
      </div>
      <span className="mt-1 block text-xs text-muted-foreground">
        {t('newItemPhotoHint', { maxMb: MENU_IMAGE_MAX_MB })}
      </span>
      {error ? (
        <span className="mt-1 block text-xs font-semibold text-brand-600" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
