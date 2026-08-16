'use client';

import type { FormEvent } from 'react';
import { Button } from '@/components/button';
import { fieldClassName } from '@/components/ui/field';

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
        disabled={busy}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`flex-1 ${fieldClassName}`}
      />
      <Button
        type="submit"
        variant="default"
        size="lg"
        pending={pending}
        busy={busy}
        disabled={!value.trim()}
      >
        {addLabel}
      </Button>
    </form>
  );
}
