'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';

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
  const interfaceLocale = useLocale();
  const names = useMemo(
    () => new Intl.DisplayNames([interfaceLocale], { type: 'language' }),
    [interfaceLocale],
  );
  if (availableLocales.length < 2) return null;
  return (
    <label className="text-xs font-bold text-muted-foreground">
      <span className="sr-only">{t('menuLanguage')}</span>
      <select
        aria-label={t('menuLanguage')}
        value={resolvedLocale}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-ink-900"
      >
        {availableLocales.map((locale) => (
          <option key={locale} value={locale}>
            {names.of(locale) ?? locale}
          </option>
        ))}
      </select>
    </label>
  );
}
