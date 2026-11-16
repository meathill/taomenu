'use client';

import type { BillingInterval } from '@taomenu/shared';

type BillingIntervalToggleProps = {
  value: BillingInterval;
  onChange: (next: BillingInterval) => void;
  monthlyLabel: string;
  yearlyLabel: string;
  yearlyBadge: string;
  groupLabel: string;
};

/** 月付 / 年付胶囊切换，视觉跟随 dyqr：圆角 pill + 年付「赠送 2 个月」徽章。 */
export function BillingIntervalToggle({
  value,
  onChange,
  monthlyLabel,
  yearlyLabel,
  yearlyBadge,
  groupLabel,
}: BillingIntervalToggleProps) {
  return (
    <fieldset className="inline-flex items-center gap-1 rounded-full border border-border bg-paper-50 p-1">
      <legend className="sr-only">{groupLabel}</legend>
      <button
        type="button"
        aria-pressed={value === 'month'}
        onClick={() => onChange('month')}
        className={
          value === 'month'
            ? 'inline-flex items-center rounded-full bg-brand-600 px-4 py-1.5 text-sm font-bold text-white shadow-sm'
            : 'inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-ink-900'
        }
      >
        {monthlyLabel}
      </button>
      <button
        type="button"
        aria-pressed={value === 'year'}
        onClick={() => onChange('year')}
        className={
          value === 'year'
            ? 'inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-1.5 text-sm font-bold text-white shadow-sm'
            : 'inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-ink-900'
        }
      >
        {yearlyLabel}
        <span
          className={
            value === 'year'
              ? 'rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-semibold text-white'
              : 'rounded-full bg-brand-50 px-1.5 py-0.5 text-xs font-semibold text-brand-700'
          }
        >
          {yearlyBadge}
        </span>
      </button>
    </fieldset>
  );
}
