'use client';

import { cn } from '@taomenu/ui';
import { type ReactNode, useId } from 'react';
import { Switch } from '@/components/ui/switch';

type FieldSwitchProps = {
  label: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
};

export function FieldSwitch({ label, checked, onCheckedChange, className }: FieldSwitchProps) {
  const inputId = useId();
  return (
    <label
      htmlFor={inputId}
      className={cn(
        'flex min-h-12 items-center justify-between gap-3 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-ink-900',
        className,
      )}
    >
      <span className="min-w-0">{label}</span>
      <Switch id={inputId} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}
