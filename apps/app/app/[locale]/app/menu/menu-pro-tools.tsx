'use client';

import { SparkleIcon, XIcon } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/button';

export function MenuProTools({
  initialHidden,
  upgradeHref,
}: {
  initialHidden: boolean;
  upgradeHref: string;
}) {
  const t = useTranslations('menu');
  const [isHidden, setIsHidden] = useState(initialHidden);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function dismiss() {
    setIsPending(true);
    setError(null);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hideMenuProTools: true }),
      });
      if (!response.ok) throw new Error(t('proToolsDismissFailed'));
      setIsHidden(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('proToolsDismissFailed'));
    } finally {
      setIsPending(false);
    }
  }

  if (isHidden) return null;
  return (
    <section className="relative flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 pr-14 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <SparkleIcon className="mt-0.5 size-5 shrink-0 text-indigo-700" weight="fill" />
        <div>
          <h2 className="text-sm font-black text-ink-900">{t('moreProToolsTitle')}</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('moreProToolsHint')}</p>
        </div>
      </div>
      <a href={upgradeHref} className="text-sm font-bold text-indigo-700">
        {t('viewProPlan')}
      </a>
      <Button
        iconOnly
        pending={isPending}
        aria-label={t('dismissProTools')}
        title={t('dismissProTools')}
        onClick={() => void dismiss()}
        className="absolute right-2 top-2 size-11 rounded-xl text-indigo-700"
      >
        <XIcon className="size-5" weight="bold" aria-hidden />
      </Button>
      {error ? <p className="text-xs font-semibold text-brand-600">{error}</p> : null}
    </section>
  );
}
