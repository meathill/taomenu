'use client';

import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/button';

export function PairForm() {
  const t = useTranslations('terminal');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/terminal/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error || t('pairFailed'));
        return;
      }
      window.location.assign('/terminal');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
      <label className="block text-sm font-bold text-ink-900">
        {t('pairCode')}
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder={t('pairCodeHint')}
          className="mt-2 min-h-12 w-full rounded-xl border border-border px-3 text-lg font-bold tracking-[0.2em] outline-none ring-jade-600 focus:ring-2"
        />
      </label>
      <label className="block text-sm font-bold text-ink-900">
        {t('deviceName')}
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          placeholder={t('deviceNameHint')}
          className="mt-2 min-h-12 w-full rounded-xl border border-border px-3 text-base outline-none ring-jade-600 focus:ring-2"
        />
      </label>
      {error ? <p className="text-sm font-semibold text-brand-600">{error}</p> : null}
      <Button
        type="submit"
        pending={busy}
        disabled={!code.trim() || !name.trim()}
        className="min-h-12 w-full rounded-xl bg-jade-600 text-base font-bold text-white"
      >
        {t('pairDevice')}
      </Button>
    </form>
  );
}
