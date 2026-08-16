'use client';

import { CheckCircleIcon } from '@phosphor-icons/react';
import { formatCurrency, getCurrencyDecimals, sanitizeCurrencyInput } from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/button';
import { compactFieldClassName, textareaClassName } from '@/components/ui/field';
import type { ReviewDraft, SuggestionGroup } from './menu-import-review';

type MenuImportReviewListProps = {
  groups: SuggestionGroup[];
  draft: ReviewDraft;
  currency: string;
  isApplying: boolean;
  isBusy: boolean;
  isApplyDisabled: boolean;
  onUpdate: (id: string, patch: Partial<ReviewDraft[string]>) => void;
  onToggleCategory: (group: SuggestionGroup, selected: boolean) => void;
  onApply: () => void;
};

export function MenuImportReviewList({
  groups,
  draft,
  currency,
  isApplying,
  isBusy,
  isApplyDisabled,
  onUpdate,
  onToggleCategory,
  onApply,
}: MenuImportReviewListProps) {
  const t = useTranslations('menu');
  const locale = useLocale();
  const hasDecimals = getCurrencyDecimals(currency) > 0;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircleIcon className="size-5 text-jade-600" weight="fill" aria-hidden />
        <h3 className="font-black text-ink-900">{t('importReviewTitle')}</h3>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">{t('importReviewHint')}</p>
      {groups.map((group) => (
        <div key={group.category.id} className="rounded-xl border border-border bg-white p-3">
          <label className="flex items-center gap-2 font-bold text-ink-900">
            <input
              type="checkbox"
              checked={draft[group.category.id]?.selected ?? false}
              onChange={(event) => onToggleCategory(group, event.target.checked)}
              className="size-5 accent-indigo-700"
            />
            <input
              value={draft[group.category.id]?.name ?? ''}
              onChange={(event) => onUpdate(group.category.id, { name: event.target.value })}
              className={`min-w-0 flex-1 ${compactFieldClassName}`}
              aria-label={t('importCategoryName')}
            />
          </label>
          <textarea
            value={draft[group.category.id]?.description ?? ''}
            onChange={(event) => onUpdate(group.category.id, { description: event.target.value })}
            placeholder={t('importDescription')}
            aria-label={t('importDescription')}
            rows={2}
            className={`mt-2 min-h-16 resize-y ${textareaClassName} text-sm`}
          />
          <ul className="mt-2 space-y-3 border-t border-border pt-2">
            {group.items.map((item) => {
              const modifierGroups = item.value.modifierGroups ?? [];
              const hasLowConfidence =
                item.confidence < 0.75 ||
                modifierGroups.some(
                  (modifierGroup) =>
                    modifierGroup.confidence < 0.75 ||
                    modifierGroup.modifiers.some((modifier) => modifier.confidence < 0.75),
                );
              return (
                <li key={item.id} className="grid grid-cols-[auto_1fr_7rem] items-center gap-2">
                  <input
                    type="checkbox"
                    disabled={!draft[group.category.id]?.selected}
                    checked={draft[item.id]?.selected ?? false}
                    onChange={(event) => onUpdate(item.id, { selected: event.target.checked })}
                    className="size-5 accent-indigo-700"
                    aria-label={t('importSelectItem', { name: draft[item.id]?.name ?? '' })}
                  />
                  <input
                    value={draft[item.id]?.name ?? ''}
                    onChange={(event) => onUpdate(item.id, { name: event.target.value })}
                    className={`min-w-0 ${compactFieldClassName}`}
                    aria-label={t('itemName')}
                  />
                  <input
                    inputMode={hasDecimals ? 'decimal' : 'numeric'}
                    value={draft[item.id]?.priceAmount ?? ''}
                    onChange={(event) =>
                      onUpdate(item.id, {
                        priceAmount: sanitizeCurrencyInput(event.target.value, currency),
                      })
                    }
                    placeholder={t('importConfirmPrice')}
                    className={`min-w-0 text-right ${compactFieldClassName}`}
                    aria-label={t('price', { currency })}
                  />
                  <textarea
                    value={draft[item.id]?.description ?? ''}
                    onChange={(event) => onUpdate(item.id, { description: event.target.value })}
                    placeholder={t('importDescription')}
                    aria-label={`${t('importDescription')}: ${draft[item.id]?.name ?? ''}`}
                    rows={2}
                    className={`col-span-2 col-start-2 min-h-16 resize-y ${textareaClassName} text-sm`}
                  />
                  {modifierGroups.length > 0 ? (
                    <div className="col-start-2 col-span-2 rounded-lg bg-paper-50 p-2 text-xs">
                      <p className="font-bold text-ink-900">{t('options')}</p>
                      {modifierGroups.map((modifierGroup) => (
                        <p
                          key={modifierGroup.name}
                          className="mt-1 leading-5 text-muted-foreground"
                        >
                          <span className="font-semibold text-ink-900">{modifierGroup.name}: </span>
                          {modifierGroup.modifiers
                            .map((modifier) =>
                              modifier.priceDeltaAmount > 0
                                ? `${modifier.name} (+${formatCurrency(modifier.priceDeltaAmount, currency, locale)})`
                                : modifier.name,
                            )
                            .join(' · ')}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  {hasLowConfidence ? (
                    <p className="col-start-2 col-span-2 text-xs font-semibold text-amber-700">
                      {t('importLowConfidence')}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <Button
        type="button"
        variant="default"
        size="lg"
        pending={isApplying}
        busy={isBusy}
        disabled={isApplyDisabled}
        onClick={onApply}
        className="w-full bg-indigo-700 hover:bg-indigo-700/90"
      >
        {t('importApply')}
      </Button>
    </div>
  );
}
