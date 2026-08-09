'use client';

import { CameraIcon, FilePdfIcon, SparkleIcon } from '@phosphor-icons/react';
import { doLocalesShareLanguage } from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/button';
import { getMenuImportFailureKey } from './menu-import-failure';
import {
  createReviewDraft,
  type ImportView,
  type ReviewDraft,
  type SuggestionGroup,
} from './menu-import-review';
import { MenuImportReviewList } from './menu-import-review-list';

export function MenuImportPanel({
  storeId,
  baseLocale,
  canUseAi,
}: {
  storeId: string;
  baseLocale: string;
  canUseAi: boolean;
}) {
  const t = useTranslations('menu');
  const locale = useLocale();
  const [view, setView] = useState<ImportView | null>(null);
  const [usage, setUsage] = useState({ used: 0, limit: 20 });
  const [file, setFile] = useState<File | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReviewDraft>({});

  const load = useCallback(async () => {
    if (!canUseAi) return;
    const response = await fetch(`/api/owner/stores/${storeId}/menu-imports`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      setError(t('importLoadFailed'));
      return;
    }
    const data = (await response.json()) as {
      view: ImportView | null;
      usage: { used: number; limit: number };
    };
    const nextView = data.view;
    setView(nextView);
    setUsage(data.usage);
    if (nextView?.menuImport.status === 'needs_review') {
      setDraft(createReviewDraft(nextView.suggestions));
    }
  }, [canUseAi, storeId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const status = view?.menuImport.status;
    if (status !== 'queued' && status !== 'processing') return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [load, view?.menuImport.status]);

  const suggestionsByCategory = useMemo(() => {
    const groups = new Map<string, SuggestionGroup>();
    for (const suggestion of view?.suggestions ?? []) {
      if (suggestion.entityType === 'category') {
        groups.set(suggestion.temporaryEntityKey, { category: suggestion, items: [] });
      }
    }
    for (const suggestion of view?.suggestions ?? []) {
      const categoryKey = suggestion.value.categoryTemporaryKey;
      if (suggestion.entityType === 'item' && categoryKey) {
        groups.get(categoryKey)?.items.push(suggestion);
      }
    }
    return [...groups.values()];
  }, [view?.suggestions]);
  const detectedLocale = view?.suggestions[0]?.locale ?? null;
  const hasLocaleMismatch = Boolean(
    detectedLocale && !doLocalesShareLanguage(baseLocale, detectedLocale),
  );
  const languageNames = useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: 'language' });
    return {
      base: names.of(baseLocale) ?? baseLocale,
      detected: detectedLocale ? (names.of(detectedLocale) ?? detectedLocale) : '',
    };
  }, [baseLocale, detectedLocale, locale]);

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusyAction('upload');
    setError(null);
    try {
      const form = new FormData();
      form.set('file', file);
      const uploaded = await fetch(`/api/owner/stores/${storeId}/menu-imports`, {
        method: 'POST',
        body: form,
      });
      const uploadData = (await uploaded.json().catch(() => null)) as {
        importId?: string;
        error?: string;
      } | null;
      if (!uploaded.ok || !uploadData?.importId) {
        setError(importErrorMessage(uploadData?.error));
        return;
      }
      const started = await fetch(
        `/api/owner/stores/${storeId}/menu-imports/${uploadData.importId}/start`,
        { method: 'POST' },
      );
      if (!started.ok) {
        setError(t('importStartFailed'));
        await load();
        return;
      }
      setFile(null);
      await load();
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRetry() {
    if (!view) return;
    setBusyAction('retry');
    setError(null);
    try {
      const response = await fetch(
        `/api/owner/stores/${storeId}/menu-imports/${view.menuImport.id}/start`,
        { method: 'POST' },
      );
      if (!response.ok) setError(t('importStartFailed'));
      await load();
    } finally {
      setBusyAction(null);
    }
  }

  function importErrorMessage(code?: string) {
    if (code === 'TOO_LARGE') return t('importTooLarge');
    if (code === 'UNSUPPORTED_TYPE') return t('importUnsupported');
    if (code === 'BAD_MAGIC' || code === 'EMPTY') return t('importInvalidFile');
    if (code === 'MONTHLY_LIMIT_REACHED') return t('importMonthlyLimitReached');
    return t('importUploadFailed');
  }

  function updateDraft(id: string, patch: Partial<ReviewDraft[string]>) {
    setDraft((current) => ({ ...current, [id]: { ...current[id]!, ...patch } }));
  }

  function toggleCategory(group: SuggestionGroup, selected: boolean) {
    setDraft((current) => {
      const next = { ...current };
      for (const suggestion of [group.category, ...group.items]) {
        const row = next[suggestion.id];
        if (row) next[suggestion.id] = { ...row, selected };
      }
      return next;
    });
  }

  async function handleApply() {
    if (!view) return;
    setBusyAction('apply');
    setError(null);
    try {
      const suggestions = view.suggestions.map((suggestion) => {
        const row = draft[suggestion.id]!;
        const priceAmount = row.priceAmount ? Number(row.priceAmount) : null;
        const value = {
          ...row.value,
          name: row.name.trim(),
          description: row.description.trim() || null,
          ...(suggestion.entityType === 'item' ? { priceAmount } : {}),
        };
        return {
          id: suggestion.id,
          decision: row.selected ? ('edited' as const) : ('rejected' as const),
          ...(row.selected ? { value } : {}),
        };
      });
      if (
        view.suggestions.some(
          (suggestion) =>
            draft[suggestion.id]?.selected &&
            (!draft[suggestion.id]?.name.trim() ||
              (suggestion.entityType === 'item' && !draft[suggestion.id]?.priceAmount)),
        )
      ) {
        setError(t('importReviewRequired'));
        return;
      }
      const reviewed = await fetch(
        `/api/owner/stores/${storeId}/menu-imports/${view.menuImport.id}/review`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suggestions }),
        },
      );
      if (!reviewed.ok) {
        setError(t('importApplyFailed'));
        return;
      }
      const applied = await fetch(
        `/api/owner/stores/${storeId}/menu-imports/${view.menuImport.id}/apply`,
        { method: 'POST' },
      );
      if (!applied.ok) {
        setError(t('importApplyFailed'));
        return;
      }
      window.location.reload();
    } finally {
      setBusyAction(null);
    }
  }

  if (!canUseAi) {
    return (
      <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <SparkleIcon className="size-5 text-indigo-700" weight="fill" aria-hidden />
          <h2 className="text-sm font-black text-ink-900">{t('photoImport')}</h2>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[0.6875rem] font-bold text-indigo-700">
            Pro
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('importProHint')}</p>
      </section>
    );
  }

  const status = view?.menuImport.status;
  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <SparkleIcon className="size-5 text-indigo-700" weight="fill" aria-hidden />
        <h2 className="text-sm font-black text-ink-900">{t('photoImport')}</h2>
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[0.6875rem] font-bold text-indigo-700">
          Luna AI
        </span>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('importPrivacyHint')}</p>
      <p className="mt-1 text-xs font-semibold text-indigo-700">{t('importMonthlyUsage', usage)}</p>

      {status === 'queued' || status === 'processing' ? (
        <div className="mt-4" role="status" aria-live="polite">
          <div className="flex items-center justify-between text-sm font-semibold text-ink-900">
            <span>{status === 'queued' ? t('importQueued') : t('importProcessing')}</span>
            <span>{view?.menuImport.progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-indigo-600 transition-[width]"
              style={{ width: `${view?.menuImport.progress ?? 0}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t('importCanLeave')}</p>
        </div>
      ) : null}

      {status === 'failed' ? (
        <div className="mt-4 rounded-xl border border-brand-200 bg-white p-3">
          <p className="text-sm font-semibold text-brand-600">{t('importFailed')}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(getMenuImportFailureKey(view?.menuImport.errorCode ?? null))}
          </p>
          <Button
            type="button"
            pending={busyAction === 'retry'}
            busy={busyAction !== null}
            onClick={() => void handleRetry()}
            className="mt-3 min-h-11 rounded-xl bg-indigo-700 px-4 text-sm font-bold text-white"
          >
            {t('importRetry')}
          </Button>
        </div>
      ) : null}

      {status === 'needs_review' ? (
        <>
          {hasLocaleMismatch ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">
              {t(
                view?.hasExistingCategories
                  ? 'importLanguageMismatchExisting'
                  : 'importLanguageWillChange',
                languageNames,
              )}
            </p>
          ) : null}
          <MenuImportReviewList
            groups={suggestionsByCategory}
            draft={draft}
            isApplying={busyAction === 'apply'}
            isBusy={busyAction !== null}
            isApplyDisabled={Boolean(hasLocaleMismatch && view?.hasExistingCategories)}
            onUpdate={updateDraft}
            onToggleCategory={toggleCategory}
            onApply={() => void handleApply()}
          />
        </>
      ) : null}

      {status === 'applied' ? (
        <p className="mt-4 rounded-xl bg-white p-3 text-sm font-semibold text-jade-700">
          {t('importApplied')}
        </p>
      ) : null}

      {!status || status === 'applied' || status === 'failed' ? (
        <form onSubmit={(event) => void handleUpload(event)} className="mt-4 space-y-3">
          <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-indigo-300 bg-white px-4 text-center">
            <span className="flex items-center gap-2 text-sm font-bold text-indigo-700">
              <CameraIcon className="size-5" weight="bold" aria-hidden />
              <FilePdfIcon className="size-5" weight="bold" aria-hidden />
              {t('importChooseFile')}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">
              {file?.name ?? t('importFileHint')}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>
          <Button
            type="submit"
            pending={busyAction === 'upload'}
            busy={busyAction !== null}
            disabled={!file || usage.used >= usage.limit}
            className="min-h-12 w-full rounded-xl bg-indigo-700 px-4 text-sm font-bold text-white"
          >
            {t('importStart')}
          </Button>
        </form>
      ) : null}
      {error ? <p className="mt-3 text-sm font-semibold text-brand-600">{error}</p> : null}
    </section>
  );
}
