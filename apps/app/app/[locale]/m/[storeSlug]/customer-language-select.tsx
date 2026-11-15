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
    <label className="relative flex min-h-11 min-w-0 max-w-[9.5rem] flex-col items-stretch justify-center gap-0.5">
      <span className="inline-flex min-w-0 items-center justify-end gap-1 text-xs font-semibold text-ink-900">
        <GlobeIcon className="size-3.5 shrink-0" weight="bold" aria-hidden />
        <span className="truncate">{t('menuLanguage')}</span>
      </span>
      <select
        aria-label={t('menuLanguage')}
        value={resolvedLocale}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full min-w-0 max-w-full rounded-lg border border-ink-900 bg-white px-2 text-sm font-semibold text-ink-900"
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
