'use client';

import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/button';

type MenuImportDiscardButtonProps = {
  storeId: string;
  importId: string;
  isBusy: boolean;
  /** 草稿无法写入时作为主要操作突出显示 */
  prominent?: boolean;
  onDiscarded: () => Promise<void>;
  onError: (message: string) => void;
};

/** 放弃当前导入并回到上传状态（issue #29）；放弃不占额度 */
export function MenuImportDiscardButton({
  storeId,
  importId,
  isBusy,
  prominent = false,
  onDiscarded,
  onError,
}: MenuImportDiscardButtonProps) {
  const t = useTranslations('menu');
  const [isPending, setIsPending] = useState(false);

  async function handleDiscard() {
    setIsPending(true);
    try {
      const response = await fetch(
        `/api/owner/stores/${storeId}/menu-imports/${importId}/discard`,
        { method: 'POST' },
      );
      if (!response.ok) {
        onError(t('importDiscardFailed'));
        return;
      }
      await onDiscarded();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant={prominent ? 'default' : 'outline'}
      pending={isPending}
      busy={isBusy || isPending}
      onClick={() => void handleDiscard()}
      className={
        prominent ? 'mt-3 bg-indigo-700 hover:bg-indigo-700/90' : 'mt-3 border-indigo-300 bg-white'
      }
    >
      <ArrowCounterClockwiseIcon className="size-4" weight="bold" aria-hidden />
      {t('importDiscard')}
    </Button>
  );
}
