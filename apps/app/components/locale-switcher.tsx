'use client';

import { LOCALE_LABELS, LOCALES, type Locale } from '@taomenu/shared';
import { useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import type { ChangeEvent } from 'react';
import { usePathname, useRouter } from '@/i18n/routing';

type LocaleSwitcherProps = {
  label: string;
};

export function LocaleSwitcher({ label }: LocaleSwitcherProps) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as Locale;
    const query = searchParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { locale: next });
  }

  return (
    <label className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-900">
      <span className="sr-only">{label}</span>
      <select
        value={locale}
        onChange={handleChange}
        className="min-h-10 rounded-xl border border-border bg-white px-2 py-1.5 text-sm font-semibold text-ink-900"
        aria-label={label}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
