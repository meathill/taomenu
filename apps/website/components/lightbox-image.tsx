'use client';

import { XIcon } from '@phosphor-icons/react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { type KeyboardEvent, type MouseEvent, useEffect, useRef, useState } from 'react';

type LightboxImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export function LightboxImage({
  src,
  alt,
  width,
  height,
  className,
  sizes,
  priority,
}: LightboxImageProps) {
  const t = useTranslations('media');
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleOpen() {
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="block w-full cursor-zoom-in rounded-[inherit] text-left"
        aria-label={t('expand', { alt })}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={className}
          sizes={sizes}
          priority={priority}
        />
      </button>
      <dialog
        ref={dialogRef}
        onClose={handleClose}
        onClick={handleBackdropClick}
        onKeyDown={handleDialogKeyDown}
        className="fixed inset-0 z-50 m-0 hidden max-h-none max-w-none items-center justify-center bg-transparent p-3 open:flex backdrop:bg-ink-900/80 sm:p-6"
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="92vw"
          quality={80}
          className="max-h-[92vh] w-auto max-w-[92vw] rounded-xl object-contain"
        />
        <button
          type="button"
          onClick={handleClose}
          className="absolute end-3 top-3 grid size-11 place-items-center rounded-xl bg-ink-900/60 text-white hover:bg-ink-900/80"
          aria-label={t('close')}
        >
          <XIcon className="size-5" weight="bold" />
        </button>
      </dialog>
    </>
  );
}
