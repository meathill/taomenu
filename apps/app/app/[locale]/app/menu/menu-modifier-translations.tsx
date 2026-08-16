'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/button';
import { compactFieldClassName } from '@/components/ui/field';
import type { MenuItem } from './menu-types';

type MenuModifierTranslationsProps = {
  storeId: string;
  item: MenuItem;
  activeLocale: string;
  baseLocale: string;
  onChanged: () => Promise<void>;
};

export function MenuModifierTranslations({
  storeId,
  item,
  activeLocale,
  baseLocale,
  onChanged,
}: MenuModifierTranslationsProps) {
  const t = useTranslations('menu');
  const initial = useMemo(() => {
    const values: Record<string, string> = {};
    for (const group of item.modifierGroups) {
      values[`group:${group.id}`] =
        group.translations.find((translation) => translation.locale === activeLocale)?.name ?? '';
      for (const option of group.options) {
        values[`option:${option.id}`] =
          option.translations.find((translation) => translation.locale === activeLocale)?.name ??
          '';
      }
    }
    return values;
  }, [activeLocale, item.modifierGroups]);
  const [values, setValues] = useState(initial);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setValues(initial), [initial]);

  async function saveTranslations() {
    setIsPending(true);
    setError(null);
    try {
      for (const group of item.modifierGroups) {
        const groupName = values[`group:${group.id}`]?.trim();
        if (groupName) {
          const response = await fetch(
            `/api/owner/stores/${storeId}/menu/modifier-groups/${group.id}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: groupName, locale: activeLocale }),
            },
          );
          if (!response.ok) throw new Error(t('translationSaveFailed'));
        }
        for (const option of group.options) {
          const optionName = values[`option:${option.id}`]?.trim();
          if (!optionName) continue;
          const response = await fetch(`/api/owner/stores/${storeId}/menu/modifiers/${option.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: optionName, locale: activeLocale }),
          });
          if (!response.ok) throw new Error(t('translationSaveFailed'));
        }
      }
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('translationSaveFailed'));
    } finally {
      setIsPending(false);
    }
  }

  if (item.modifierGroups.length === 0) return null;

  return (
    <section className="mt-6 border-t border-border pt-5">
      <h3 className="text-sm font-black text-ink-900">{t('modifierTranslations')}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{t('modifierTranslationsHint')}</p>
      <div className="mt-3 space-y-4">
        {item.modifierGroups.map((group) => {
          const baseName =
            group.translations.find((translation) => translation.locale === baseLocale)?.name ??
            '—';
          return (
            <div key={group.id} className="rounded-xl border border-border p-3">
              <label className="text-xs font-semibold text-muted-foreground">
                {t('groupTranslationLabel', { name: baseName })}
                <input
                  value={values[`group:${group.id}`] ?? ''}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      [`group:${group.id}`]: event.target.value,
                    }))
                  }
                  className={`mt-1 ${compactFieldClassName}`}
                />
              </label>
              <div className="mt-3 space-y-2">
                {group.options.map((option) => {
                  const optionBaseName =
                    option.translations.find((translation) => translation.locale === baseLocale)
                      ?.name ?? '—';
                  return (
                    <label key={option.id} className="block text-xs text-muted-foreground">
                      {optionBaseName}
                      <input
                        value={values[`option:${option.id}`] ?? ''}
                        onChange={(event) =>
                          setValues((current) => ({
                            ...current,
                            [`option:${option.id}`]: event.target.value,
                          }))
                        }
                        className={`mt-1 ${compactFieldClassName}`}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <Button
        variant="outline"
        size="lg"
        pending={isPending}
        onClick={() => void saveTranslations()}
        className="mt-3 w-full"
      >
        {t('saveModifierTranslations')}
      </Button>
      {error ? <p className="mt-2 text-sm font-semibold text-brand-600">{error}</p> : null}
    </section>
  );
}
