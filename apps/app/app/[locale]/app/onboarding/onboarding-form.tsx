'use client';

import { type CreateStoreBody, SERVICE_MODES } from '@taomenu/shared';
import { cn } from '@taomenu/ui';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/button';

const DRAFT_KEY = 'taomenu.onboarding.draft';

type Draft = {
  name: string;
  serviceMode: CreateStoreBody['serviceMode'];
};

const MODE_LABELS: Record<CreateStoreBody['serviceMode'], { title: string; desc: string }> = {
  table_service: {
    title: 'Ăn tại bàn',
    desc: 'Mỗi bàn một mã QR. Không bắt buộc điểm lấy món.',
  },
  counter_pickup: {
    title: 'Lấy tại quầy',
    desc: 'Quán ít chỗ ngồi. Dùng mã lấy món và số thứ tự.',
  },
  hybrid: {
    title: 'Kết hợp',
    desc: 'Vừa bàn vừa mang đi / lấy quầy.',
  },
};

function loadDraft(): Draft {
  if (typeof window === 'undefined') {
    return { name: '', serviceMode: 'table_service' };
  }
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) {
      return { name: '', serviceMode: 'table_service' };
    }
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return {
      name: parsed.name ?? '',
      serviceMode: parsed.serviceMode ?? 'table_service',
    };
  } catch {
    return { name: '', serviceMode: 'table_service' };
  }
}

export function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [serviceMode, setServiceMode] = useState<CreateStoreBody['serviceMode']>('table_service');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const draft = loadDraft();
    setName(draft.name);
    setServiceMode(draft.serviceMode);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const draft: Draft = { name, serviceMode };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [name, serviceMode, ready]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const res = await fetch('/api/owner/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          serviceMode,
          timezone: 'Asia/Ho_Chi_Minh',
          baseLocale: 'vi',
        } satisfies CreateStoreBody),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || 'Tạo cửa hàng thất bại.');
        return;
      }
      localStorage.removeItem(DRAFT_KEY);
      router.push('/app');
      router.refresh();
    } catch {
      setError('Tạo cửa hàng thất bại.');
    } finally {
      setIsPending(false);
    }
  }

  if (!ready) {
    return <div className="min-h-40 animate-pulse rounded-2xl bg-muted" />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {step === 1 ? (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-ink-900" htmlFor="store-name">
            Tên cửa hàng
          </label>
          <input
            id="store-name"
            required
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-border bg-white px-3 text-base text-ink-900 outline-none ring-jade-600 focus:ring-2"
            placeholder="Phở Hà Nội"
          />
          <p className="text-xs text-muted-foreground">Có thể đổi sau trong phần cài đặt.</p>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => setStep(2)}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-jade-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            Tiếp tục
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-ink-900">Hình thức phục vụ</p>
          <ul className="space-y-2">
            {SERVICE_MODES.map((mode) => {
              const meta = MODE_LABELS[mode];
              const selected = serviceMode === mode;
              return (
                <li key={mode}>
                  <button
                    type="button"
                    onClick={() => setServiceMode(mode)}
                    className={cn(
                      'w-full rounded-2xl border px-4 py-3 text-left',
                      selected
                        ? 'border-jade-600 bg-white ring-2 ring-jade-600'
                        : 'border-border bg-white',
                    )}
                  >
                    <span className="block text-sm font-bold text-ink-900">{meta.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{meta.desc}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {serviceMode === 'counter_pickup' ? (
            <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-brand-700">
              Quán không ghế / ít ghế không cần tạo số bàn. Bước sau chỉ cần mã lấy món.
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-bold text-ink-900"
            >
              Quay lại
            </button>
            <Button
              type="submit"
              pending={isPending}
              className="min-h-12 flex-1 rounded-xl bg-jade-600 px-4 text-sm font-bold text-white"
            >
              Tạo cửa hàng
            </Button>
          </div>
        </div>
      )}

      {error ? <p className="text-sm font-medium text-brand-600">{error}</p> : null}
    </form>
  );
}
