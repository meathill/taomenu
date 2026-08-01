'use client';

import { formatVnd } from '@taomenu/shared';
import { useMemo, useState } from 'react';

export type PublicModifierOption = {
  id: string;
  name: string;
  priceDeltaAmount: number;
};

export type PublicModifierGroup = {
  id: string;
  name: string;
  minSelected: number;
  maxSelected: number;
  isRequired: boolean;
  options: PublicModifierOption[];
};

export type PublicMenuItem = {
  id: string;
  name: string;
  priceAmount: number;
  isSoldOut: boolean;
  modifierGroups: PublicModifierGroup[];
};

export type CartLineSelection = {
  menuItemId: string;
  name: string;
  priceAmount: number;
  quantity: number;
  modifierIds: string[];
  lineKey: string;
};

type ModifierPickerProps = {
  item: PublicMenuItem;
  onCancel: () => void;
  onConfirm: (selection: Omit<CartLineSelection, 'quantity'>) => void;
};

export function cartLineKey(menuItemId: string, modifierIds: string[]): string {
  const sorted = [...modifierIds].sort();
  return `${menuItemId}:${sorted.join(',')}`;
}

export function ModifierPicker({ item, onCancel, onConfirm }: ModifierPickerProps) {
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    for (const group of item.modifierGroups) {
      initial[group.id] = [];
    }
    return initial;
  });
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
        setError(`Chọn ${group.name} (tối thiểu ${min}).`);
        return;
      }
      if (count > group.maxSelected) {
        setError(`${group.name}: tối đa ${group.maxSelected}.`);
        return;
      }
    }
    onConfirm({
      menuItemId: item.id,
      name: nameSnapshot,
      priceAmount: unitPrice,
      modifierIds: selectedIds,
      lineKey: cartLineKey(item.id, selectedIds),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-ink-900">{item.name}</h2>
            <p className="text-sm tabular-nums text-muted-foreground">
              {formatVnd(item.priceAmount)}
            </p>
          </div>
          <button type="button" className="text-sm font-bold text-ink-900" onClick={onCancel}>
            Đóng
          </button>
        </div>

        <ul className="mt-4 space-y-4">
          {item.modifierGroups.map((group) => (
            <li key={group.id}>
              <p className="text-sm font-bold text-ink-900">
                {group.name}
                <span className="ml-1 font-normal text-muted-foreground">
                  {group.isRequired ? '(bắt buộc)' : '(tuỳ chọn)'}
                  {group.maxSelected > 1 ? ` · tối đa ${group.maxSelected}` : null}
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
                        className={`flex min-h-12 w-full items-center justify-between rounded-xl border px-3 text-left text-sm font-semibold ${
                          checked
                            ? 'border-jade-600 bg-jade-50 text-jade-800'
                            : 'border-border text-ink-900'
                        }`}
                      >
                        <span>{option.name}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {option.priceDeltaAmount > 0
                            ? `+${formatVnd(option.priceDeltaAmount)}`
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

        {error ? <p className="mt-3 text-sm font-medium text-brand-600">{error}</p> : null}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="min-h-12 flex-1 rounded-xl border border-border text-sm font-bold"
            onClick={onCancel}
          >
            Hủy
          </button>
          <button
            type="button"
            className="min-h-12 flex-1 rounded-xl bg-brand-600 text-sm font-bold text-white"
            onClick={handleConfirm}
          >
            Thêm · {formatVnd(unitPrice)}
          </button>
        </div>
      </div>
    </div>
  );
}
