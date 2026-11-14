'use client';

import { GlobeIcon } from '@phosphor-icons/react';
import { useTranslations } from 'next-intl';
import { languageEndonym } from '../language-endonym';

export function CustomerLanguageSelect({
  availableLocales,
  resolvedLocale,
  onChange,
}: {
  availableLocales: string[];
  resolvedLocale: string;
  onChange: (locale: string) => void;
}) {
  const t = useTranslations('customer');
  if (availableLocales.length < 2) return null;
  return (
    <label className="flex min-w-0 max-w-[11rem] flex-col items-stretch gap-1">
      <span className="inline-flex min-w-0 items-center justify-end gap-1 text-xs font-bold text-ink-900">
        <GlobeIcon className="size-4 shrink-0" weight="bold" aria-hidden />
        <span className="truncate">{t('menuLanguage')}</span>
      </span>
      <select
        aria-label={t('menuLanguage')}
        value={resolvedLocale}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full min-w-0 max-w-full rounded-xl border-2 border-ink-900 bg-white px-2 text-base font-bold text-ink-900"
      >
        {availableLocales.map((locale) => (
          <option key={locale} value={locale}>
            {languageEndonym(locale)}
          </option>
        ))}
      </select>
    </label>
  );
}
