import { charCountState } from '@/lib/char-count';

/** 输入框下方的字数计数（配合 maxLength 使用） */
export function CharCount({ value, max }: { value: string; max: number }) {
  const state = charCountState(value.length, max);
  if (state === 'hidden') return null;
  return (
    <span
      className={`mt-1 block text-right text-xs tabular-nums ${
        state === 'limit' ? 'font-semibold text-brand-600' : 'text-muted-foreground'
      }`}
      aria-live="polite"
    >
      {value.length}/{max}
    </span>
  );
}
