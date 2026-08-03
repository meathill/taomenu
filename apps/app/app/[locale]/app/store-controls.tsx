'use client';

import { useState } from 'react';
import { Button } from '@/components/button';

type StoreControlsProps = {
  storeId: string;
  acceptingPublicRequests: boolean;
};

export function StoreControls({ storeId, acceptingPublicRequests }: StoreControlsProps) {
  const [accepting, setAccepting] = useState(acceptingPublicRequests);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    const next = !accepting;
    try {
      const res = await fetch(`/api/owner/stores/${storeId}/order-intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptingPublicRequests: next }),
      });
      if (!res.ok) {
        setError('Cập nhật thất bại.');
        return;
      }
      setAccepting(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-border bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink-900">Nhận order công khai</p>
          <p className="text-xs text-muted-foreground">
            {accepting
              ? 'Đang mở — khách quét mã có thể order.'
              : 'Đã tạm dừng — khách không gửi được order mới.'}
          </p>
        </div>
        <Button
          type="button"
          pending={busy}
          onClick={() => void toggle()}
          className={
            accepting
              ? 'min-h-11 shrink-0 rounded-xl border border-brand-600 px-3 text-xs font-bold text-brand-600'
              : 'min-h-11 shrink-0 rounded-xl bg-jade-600 px-3 text-xs font-bold text-white'
          }
        >
          {accepting ? 'Tạm dừng' : 'Mở lại'}
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs text-brand-600">{error}</p> : null}
    </div>
  );
}
