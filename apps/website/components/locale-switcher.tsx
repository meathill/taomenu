'use client';

import { LOCALE_LABELS, LOCALES, type Locale } from '@taomenu/shared';
import { useLocale } from 'next-intl';
import type { ChangeEvent } from 'react';
import { usePathname, useRouter } from '@/i18n/routing';
import { getBlogSlugForLocale, resolveBlogContentKey } from '@/lib/blog-slugs';

type LocaleSwitcherProps = {
  label: string;
};

function remapPathForLocale(pathname: string, nextLocale: Locale): string {
  const match = /^\/blog\/([^/]+)$/.exec(pathname);
  if (!match?.[1]) {
    return pathname;
  }
  const contentKey = resolveBlogContentKey(match[1]);
  if (!contentKey) {
    return pathname;
  }
  return `/blog/${getBlogSlugForLocale(contentKey, nextLocale)}`;
}

export function LocaleSwitcher({ label }: LocaleSwitcherProps) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as Locale;
    const nextPath = remapPathForLocale(pathname, next);
    router.replace(nextPath, { locale: next });
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
