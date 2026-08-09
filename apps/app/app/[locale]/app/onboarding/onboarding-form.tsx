'use client';

import {
  BILLING_CURRENCIES,
  type CreateStoreBody,
  SERVICE_MODES,
  toBillingCurrency,
} from '@taomenu/shared';
import { cn } from '@taomenu/ui';
import { useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/button';

const DRAFT_KEY = 'taomenu.onboarding.draft';

type StoreCurrency = NonNullable<CreateStoreBody['currency']>;

type Draft = {
  name: string;
  serviceMode: CreateStoreBody['serviceMode'];
  currency: StoreCurrency;
};

const EMPTY_DRAFT: Draft = { name: '', serviceMode: 'table_service', currency: 'VND' };

function loadDraft(): Draft {
  if (typeof window === 'undefined') {
    return EMPTY_DRAFT;
  }
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) {
      return EMPTY_DRAFT;
    }
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return {
      name: parsed.name ?? EMPTY_DRAFT.name,
      serviceMode: parsed.serviceMode ?? EMPTY_DRAFT.serviceMode,
      currency: toBillingCurrency(parsed.currency),
    };
  } catch {
    return EMPTY_DRAFT;
  }
}

export function OnboardingForm() {
  const t = useTranslations('onboarding');
  const locale = useLocale();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [serviceMode, setServiceMode] = useState<CreateStoreBody['serviceMode']>('table_service');
  const [currency, setCurrency] = useState<StoreCurrency>('VND');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const draft = loadDraft();
    setName(draft.name);
    setServiceMode(draft.serviceMode);
    setCurrency(draft.currency);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const draft: Draft = { name, serviceMode, currency };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [name, serviceMode, currency, ready]);

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
          // 菜单内容默认语言跟当前 UI 语言一致
          baseLocale: locale,
          currency,
        } satisfies CreateStoreBody),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error || t('errorCreate'));
        return;
      }
      localStorage.removeItem(DRAFT_KEY);
      // 整页跳转，避免 SPA 导航与 session 不同步
      window.location.assign('/app');
    } catch {
      setError(t('errorCreate'));
      setIsPending(false);
    }
  }

  if (!ready) {
    return <div className="min-h-40 animate-pulse rounded-2xl bg-muted" />;
  }

  const modeMeta: Record<CreateStoreBody['serviceMode'], { title: string; desc: string }> = {
    table_service: { title: t('modeTableTitle'), desc: t('modeTableDesc') },
    counter_pickup: { title: t('modeCounterTitle'), desc: t('modeCounterDesc') },
    hybrid: { title: t('modeHybridTitle'), desc: t('modeHybridDesc') },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {step === 1 ? (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-ink-900" htmlFor="store-name">
            {t('storeName')}
          </label>
          <input
            id="store-name"
            required
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="min-h-12 w-full rounded-xl border border-border bg-white px-3 text-base text-ink-900 outline-none ring-jade-600 focus:ring-2"
            placeholder={t('storeNamePlaceholder')}
          />
          <p className="text-xs text-muted-foreground">{t('storeNameHint')}</p>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => setStep(2)}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-jade-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {t('continue')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-ink-900">{t('serviceMode')}</p>
          <ul className="space-y-2">
            {SERVICE_MODES.map((mode) => {
              const meta = modeMeta[mode];
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
              {t('counterHint')}
            </p>
          ) : null}
          <label className="block text-sm font-semibold text-ink-900" htmlFor="store-currency">
            {t('currency')}
          </label>
          <select
            id="store-currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value as StoreCurrency)}
            className="min-h-12 w-full rounded-xl border border-border bg-white px-3 text-base text-ink-900 outline-none ring-jade-600 focus:ring-2"
          >
            {BILLING_CURRENCIES.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{t('currencyHint')}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-bold text-ink-900"
            >
              {t('back')}
            </button>
            <Button
              type="submit"
              pending={isPending}
              className="min-h-12 flex-1 rounded-xl bg-jade-600 px-4 text-sm font-bold text-white"
            >
              {t('createStore')}
            </Button>
          </div>
        </div>
      )}

      {error ? <p className="text-sm font-medium text-brand-600">{error}</p> : null}
    </form>
  );
}
