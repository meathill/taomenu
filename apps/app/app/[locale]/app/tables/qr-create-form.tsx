'use client';

import type { FormEvent } from 'react';
import { Button } from '@/components/button';

type QrCreateFormProps = {
  value: string;
  placeholder: string;
  addLabel: string;
  pending: boolean;
  busy: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function QrCreateForm({
  value,
  placeholder,
  addLabel,
  pending,
  busy,
  onChange,
  onSubmit,
}: QrCreateFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-h-12 flex-1 rounded-xl border border-border px-3 text-base outline-none ring-jade-600 focus:ring-2"
      />
      <Button
        type="submit"
        pending={pending}
        busy={busy}
        disabled={!value.trim()}
        className="min-h-12 rounded-xl bg-jade-600 px-4 text-sm font-bold text-white"
      >
        {addLabel}
      </Button>
    </form>
  );
}
