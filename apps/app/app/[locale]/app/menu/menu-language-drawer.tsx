'use client';

import { CheckIcon, TranslateIcon } from '@phosphor-icons/react';
import { isMenuLocaleAllowed, type PlanId } from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { usePaywall } from '@/components/paywall/paywall-provider';
import { ProBadge } from '@/components/paywall/pro-badge';
import { ResponsiveDrawer } from '@/components/responsive-drawer';
import { MenuTranslationPanel } from './menu-translation-panel';

const MENU_LOCALES = ['en', 'vi', 'zh', 'ja'] as const;

type MenuLanguageDrawerProps = {
  open: boolean;
  storeId: string;
  plan: PlanId;
  existingLocales: string[];
  baseLocale: string;
  activeLocale: string;
  canUseAi: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectLocale: (locale: string) => void;
};

export function MenuLanguageDrawer({
  open,
  storeId,
  plan,
  existingLocales,
  baseLocale,
  activeLocale,
  canUseAi,
  onOpenChange,
  onSelectLocale,
}: MenuLanguageDrawerProps) {
  const t = useTranslations('menu');
  const { openPaywall } = usePaywall();
  const interfaceLocale = useLocale();
  const [previewLocale, setPreviewLocale] = useState(activeLocale);
  const names = useMemo(
    () => new Intl.DisplayNames([interfaceLocale], { type: 'language' }),
    [interfaceLocale],
  );
  function isLocked(locale: string) {
    return !isMenuLocaleAllowed({
      plan,
      baseLocale,
      locale,
      existingLocales,
    });
  }

  function selectLocale(locale: string) {
    setPreviewLocale(locale);
    if (!isLocked(locale)) onSelectLocale(locale);
  }

  const selectedLocale = isLocked(previewLocale) ? previewLocale : activeLocale;
  const selectedIsLocked = isLocked(selectedLocale);
  return (
    <ResponsiveDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={t('menuLanguages')}
      description={t('menuLanguagesHint')}
    >
      <ul className="space-y-2">
        {MENU_LOCALES.map((locale) => {
          const isBase = locale === baseLocale;
          const locked = isLocked(locale);
          return (
            <li key={locale}>
              <button
                type="button"
                onClick={() => selectLocale(locale)}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-border bg-white px-3 text-left hover:bg-muted"
              >
                <TranslateIcon className="size-5 text-jade-600" weight="bold" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-ink-900">
                    {names.of(locale) ?? locale}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {isBase
                      ? t('baseLanguage')
                      : locked
                        ? t('proOnlyLanguage')
                        : t('translationLanguage')}
                  </span>
                </span>
                {locked ? (
                  <ProBadge />
                ) : locale === activeLocale ? (
                  <CheckIcon className="size-5 text-jade-600" weight="bold" aria-hidden />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {selectedLocale !== baseLocale && selectedIsLocked ? (
        // Free 为基础语言 + 1 种：只有再加第 3 种时才出现 Pro 门禁
        <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
          <p className="text-sm font-bold text-ink-900">
            {t('freeLanguageLimitTitle', { language: names.of(selectedLocale) ?? selectedLocale })}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('freeLanguageLimitBody', { base: names.of(baseLocale) ?? baseLocale })}
          </p>
          <button
            type="button"
            onClick={() => openPaywall('translation')}
            className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-bold text-white"
          >
            {t('viewProPlan')}
          </button>
        </div>
      ) : null}

      {selectedLocale !== baseLocale && !selectedIsLocked ? (
        <div className="mt-6 border-t border-border pt-5">
          <p className="mb-3 text-sm font-bold text-ink-900">
            {t('manualOrAiTranslation', { language: names.of(selectedLocale) ?? selectedLocale })}
          </p>
          <MenuTranslationPanel
            storeId={storeId}
            targetLocale={selectedLocale}
            canUseAi={canUseAi}
          />
        </div>
      ) : null}
    </ResponsiveDrawer>
  );
}
