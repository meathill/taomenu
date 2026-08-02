'use client';

import { ImageIcon, TrashIcon } from '@phosphor-icons/react';
import { useRef } from 'react';
import { publicMediaPath } from '@/lib/menu-image';

type MenuItemImageProps = {
  storeId: string;
  itemId: string;
  imageKey: string | null;
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onError: (message: string | null) => void;
  onChanged: () => Promise<void>;
};

export function MenuItemImage({
  storeId,
  itemId,
  imageKey,
  busy,
  onBusy,
  onError,
  onChanged,
}: MenuItemImageProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    onBusy(true);
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
        onError(data?.error || 'Upload ảnh thất bại.');
        return;
      }
      await onChanged();
    } finally {
      onBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function handleRemove() {
    onBusy(true);
    onError(null);
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/menu/items/${itemId}/image`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        onError('Xóa ảnh thất bại.');
        return;
      }
      await onChanged();
    } finally {
      onBusy(false);
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
      <button
        type="button"
        disabled={busy}
        title="Ảnh món"
        aria-label="Tải ảnh món"
        onClick={() => inputRef.current?.click()}
        className="inline-flex size-11 items-center justify-center rounded-xl border border-border text-ink-900 disabled:opacity-60"
      >
        <ImageIcon className="size-4" weight="bold" aria-hidden />
      </button>
      {imageKey ? (
        <button
          type="button"
          disabled={busy}
          title="Xóa ảnh"
          aria-label="Xóa ảnh món"
          onClick={() => void handleRemove()}
          className="inline-flex size-11 items-center justify-center rounded-xl border border-border text-brand-600 disabled:opacity-60"
        >
          <TrashIcon className="size-4" weight="bold" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
