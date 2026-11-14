'use client';

import { formatCurrency } from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/button';
import { textareaClassName } from '@/components/ui/field';
import {
  parseQuickAddLines,
  QUICK_ADD_MAX_LINES,
  type QuickAddErrorReason,
} from './menu-quick-add';

type MenuQuickAddPanelProps = {
  storeId: string;
  currency: string;
  categoryId: string;
  baseLocale: string;
  onChanged: () => Promise<void>;
};

const REASON_KEYS: Record<QuickAddErrorReason, string> = {
  format: 'quickAddErrorFormat',
  negative: 'priceNegative',
  nameTooLong: 'quickAddErrorNameTooLong',
  tooMany: 'quickAddErrorTooMany',
};

/** 批量快速添加：每行「菜名 - 价格」，逐条调用现有的创建菜品接口（Free 可用） */
export function MenuQuickAddPanel({
  storeId,
  currency,
  categoryId,
  baseLocale,
  onChanged,
}: MenuQuickAddPanelProps) {
  const t = useTranslations('menu');
  const locale = useLocale();
  const [text, setText] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { items, errors } = parseQuickAddLines(text, currency);

  async function handleSubmit() {
    if (!categoryId || items.length === 0 || errors.length > 0) return;
    setIsPending(true);
    setProgress(0);
    setMessage(null);
    setSubmitError(null);
    const failed: string[] = [];
    let added = 0;
    for (const item of items) {
      try {
        const response = await fetch(`/api/owner/stores/${storeId}/menu/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryId,
            name: item.name,
            priceAmount: item.priceAmount,
            locale: baseLocale,
          }),
        });
        if (response.ok) {
          added += 1;
        } else {
          failed.push(text.split(/\r?\n/)[item.line - 1] ?? item.name);
        }
      } catch {
        failed.push(text.split(/\r?\n/)[item.line - 1] ?? item.name);
      }
      setProgress((current) => current + 1);
    }
    // 只留下失败的行，方便重试；成功的不会被重复创建
    setText(failed.join('\n'));
    setMessage(added > 0 ? t('quickAddDone', { count: added }) : null);
    setSubmitError(failed.length > 0 ? t('quickAddFailed', { count: failed.length }) : null);
    setIsPending(false);
    if (added > 0) await onChanged();
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-ink-900">
        {t('quickAddLabel')}
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={8}
          disabled={isPending}
          placeholder={t('quickAddPlaceholder')}
          className={`mt-1 ${textareaClassName} font-mono`}
        />
      </label>
      <p className="text-xs text-muted-foreground">
        {t('quickAddHint', { max: QUICK_ADD_MAX_LINES })}
      </p>
      {errors.length > 0 ? (
        <ul className="space-y-1 rounded-xl bg-brand-50 p-3 text-xs text-brand-700" role="alert">
          {errors.map((error) => (
            <li key={error.line} className="wrap-anywhere">
              {t('quickAddLineError', { line: error.line })} {t(REASON_KEYS[error.reason])}
              <span className="text-ink-900"> — {error.text}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {items.length > 0 ? (
        <ul className="divide-y divide-border rounded-xl border border-border px-3 text-sm">
          {items.map((item) => (
            <li key={item.line} className="flex items-start justify-between gap-3 py-2">
              <span className="min-w-0 wrap-anywhere">{item.name}</span>
              <span className="shrink-0 tabular-nums">
                {formatCurrency(item.priceAmount, currency, locale)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {message ? <p className="text-sm font-semibold text-jade-700">{message}</p> : null}
      {submitError ? <p className="text-sm font-semibold text-brand-600">{submitError}</p> : null}
      <Button
        type="button"
        size="lg"
        pending={isPending}
        disabled={!categoryId || items.length === 0 || errors.length > 0}
        onClick={() => void handleSubmit()}
        className="w-full"
      >
        {isPending
          ? t('quickAddProgress', { done: progress, total: items.length })
          : t('quickAddSubmit', { count: items.length })}
      </Button>
    </div>
  );
}
