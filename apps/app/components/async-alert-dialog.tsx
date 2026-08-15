'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type AsyncAlertDialogProps = {
  open: boolean;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
};

export function AsyncAlertDialog({
  open,
  title,
  description,
  cancelLabel,
  confirmLabel,
  onOpenChange,
  onConfirm,
}: AsyncAlertDialogProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return;
    if (!nextOpen) setError(null);
    onOpenChange(nextOpen);
  }

  async function handleConfirm() {
    setIsPending(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogPopup aria-busy={isPending || undefined}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
          {error ? (
            <p className="text-sm font-medium text-brand-600" role="alert">
              {error}
            </p>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
            className="min-h-11 rounded-xl border border-border px-4 text-sm font-bold text-ink-900 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <Button
            pending={isPending}
            onClick={() => void handleConfirm()}
            className="min-h-11 rounded-xl bg-brand-600 px-4 text-sm font-bold text-white"
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
