'use client';

import { MinusIcon, PlusIcon, XIcon } from '@phosphor-icons/react';
import { formatCurrency } from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { publicMediaPath } from '@/lib/menu-image';
import {
  type CartLineSelection,
  cartLineKey,
  type PublicMenuItem,
  type PublicModifierGroup,
} from './modifier-picker';

type CustomerItemSheetProps = {
  item: PublicMenuItem;
  currency: string;
  onCancel: () => void;
  onConfirm: (selection: Omit<CartLineSelection, 'quantity'>, quantity: number) => void;
};

const MAX_QTY = 99;

/** 顾客菜品详情：大图、完整简介、规格、数量，底部固定加入订单按钮 */
export function CustomerItemSheet({ item, currency, onCancel, onConfirm }: CustomerItemSheetProps) {
  const t = useTranslations('customer');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    for (const group of item.modifierGroups) {
      initial[group.id] = [];
    }
    return initial;
  });
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const selectedIds = useMemo(() => Object.values(selectedByGroup).flat(), [selectedByGroup]);

  const unitPrice = useMemo(() => {
    let total = item.priceAmount;
    for (const group of item.modifierGroups) {
      for (const option of group.options) {
        if (selectedIds.includes(option.id)) {
          total += option.priceDeltaAmount;
        }
      }
    }
    return total;
  }, [item, selectedIds]);

  const linePrice = unitPrice * quantity;

  const nameSnapshot = useMemo(() => {
    const parts: string[] = [];
    for (const group of item.modifierGroups) {
      for (const option of group.options) {
        if (selectedIds.includes(option.id)) parts.push(option.name);
      }
    }
    return parts.length > 0 ? `${item.name} (${parts.join(', ')})` : item.name;
  }, [item, selectedIds]);

  function toggleOption(group: PublicModifierGroup, optionId: string) {
    setSelectedByGroup((prev) => {
      const current = prev[group.id] ?? [];
      const has = current.includes(optionId);
      let next: string[];
      if (group.maxSelected <= 1) {
        next = has ? [] : [optionId];
      } else if (has) {
        next = current.filter((id) => id !== optionId);
      } else if (current.length >= group.maxSelected) {
        next = [...current.slice(1), optionId];
      } else {
        next = [...current, optionId];
      }
      return { ...prev, [group.id]: next };
    });
    setError(null);
  }

  function handleConfirm() {
    for (const group of item.modifierGroups) {
      const count = (selectedByGroup[group.id] ?? []).length;
      const min = group.isRequired ? Math.max(group.minSelected, 1) : group.minSelected;
      if (count < min) {
        setError(t('modifierMinError', { name: group.name, min }));
        return;
      }
      if (count > group.maxSelected) {
        setError(t('modifierMaxError', { name: group.name, max: group.maxSelected }));
        return;
      }
    }
    onConfirm(
      {
        menuItemId: item.id,
        name: nameSnapshot,
        priceAmount: unitPrice,
        modifierIds: selectedIds,
        lineKey: cartLineKey(item.id, selectedIds),
      },
      quantity,
    );
  }

  const description = item.description?.trim() || null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label={tCommon('close')}
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        className="relative z-10 flex max-h-[85vh] w-full min-w-0 max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
      >
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          {item.imageKey ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={publicMediaPath(item.imageKey)} alt="" className="h-52 w-full object-cover" />
          ) : null}
          <div className="flex items-start justify-between gap-3 px-4 pt-4">
            <div className="min-w-0 flex-1">
              <h2 className="wrap-anywhere text-lg font-extrabold text-ink-900">{item.name}</h2>
              <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                {formatCurrency(item.priceAmount, currency, locale)}
              </p>
            </div>
            <button
              type="button"
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-900"
              onClick={onCancel}
              aria-label={tCommon('close')}
            >
              <XIcon className="size-5" weight="bold" aria-hidden />
            </button>
          </div>
          {description ? (
            <p className="mt-3 wrap-anywhere px-4 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}

          {item.modifierGroups.length > 0 ? (
            <ul className="mt-4 space-y-4 px-4">
              {item.modifierGroups.map((group) => (
                <li key={group.id}>
                  <p className="text-sm font-bold text-ink-900">
                    {group.name}
                    <span className="ml-1 font-normal text-muted-foreground">
                      {group.isRequired ? t('required') : t('optional')}
                      {group.maxSelected > 1
                        ? ` · ${t('maxTag', { max: group.maxSelected })}`
                        : null}
                    </span>
                  </p>
                  <ul className="mt-2 space-y-2">
                    {group.options.map((option) => {
                      const checked = (selectedByGroup[group.id] ?? []).includes(option.id);
                      return (
                        <li key={option.id}>
                          <button
                            type="button"
                            onClick={() => toggleOption(group, option.id)}
                            className={`flex min-h-12 w-full min-w-0 items-center justify-between gap-3 rounded-xl border px-3 text-left text-sm font-semibold ${
                              checked
                                ? 'border-jade-600 bg-jade-50 text-jade-800'
                                : 'border-border text-ink-900'
                            }`}
                          >
                            <span className="min-w-0 wrap-anywhere">{option.name}</span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              {option.priceDeltaAmount > 0
                                ? `+${formatCurrency(option.priceDeltaAmount, currency, locale)}`
                                : '—'}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          ) : null}

          {error ? (
            <p className="mt-3 px-4 text-sm font-medium text-brand-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-border bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink-900">{t('qty')}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={t('decreaseQuantity')}
                disabled={quantity <= 1}
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                className="grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-white text-ink-900 disabled:opacity-40"
              >
                <MinusIcon className="size-4" aria-hidden />
              </button>
              <span className="w-8 text-center text-base font-bold tabular-nums">{quantity}</span>
              <button
                type="button"
                aria-label={t('increaseQuantity')}
                disabled={quantity >= MAX_QTY}
                onClick={() => setQuantity((current) => Math.min(MAX_QTY, current + 1))}
                className="grid size-11 shrink-0 place-items-center rounded-lg border border-border bg-white text-ink-900 disabled:opacity-40"
              >
                <PlusIcon className="size-4" aria-hidden />
              </button>
            </div>
          </div>
          <button
            type="button"
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-600 px-3 text-sm font-bold text-white"
            onClick={handleConfirm}
          >
            {t('addToOrderWithPrice', { price: formatCurrency(linePrice, currency, locale) })}
          </button>
        </div>
      </div>
    </div>
  );
}
