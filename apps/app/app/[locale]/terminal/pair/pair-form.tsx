'use client';

import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/button';
import { fieldClassName } from '@/components/ui/field';

type PairFormProps = {
  code: string | null;
};

export function PairForm({ code }: PairFormProps) {
  const t = useTranslations('terminal');
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
        setError(
          data?.error === 'TERMINAL_LIMIT'
            ? t('pairSeatLimit')
            : data?.error === 'STAFF_ALREADY_PAIRED'
              ? t('pairAlreadyPaired')
              : data?.error === 'OWNER_CANNOT_PAIR'
                ? t('pairOwnerNotAllowed')
                : t('pairFailed'),
        );
        return;
      }
      window.location.assign('/terminal');
    } finally {
      setBusy(false);
    }
  }

  if (!code) {
    return <p className="text-sm leading-6 text-muted-foreground">{t('scanRequired')}</p>;
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
      <div>
        <p className="text-sm font-bold text-ink-900">{t('pairCode')}</p>
        <p className="mt-2 rounded-xl border border-jade-600 bg-jade-50 px-3 py-3 text-center font-mono text-3xl font-black tracking-[0.18em] text-ink-900">
          {code}
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{t('pairCodeConfirm')}</p>
      </div>
      <label className="block text-sm font-bold text-ink-900">
        {t('deviceName')}
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          placeholder={t('deviceNameHint')}
          className={`mt-2 ${fieldClassName}`}
        />
      </label>
      {error ? <p className="text-sm font-semibold text-brand-600">{error}</p> : null}
      <Button
        type="submit"
        variant="default"
        size="lg"
        pending={busy}
        disabled={!name.trim()}
        className="w-full"
      >
        {t('pairDevice')}
      </Button>
    </form>
  );
}
