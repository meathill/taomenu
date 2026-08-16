'use client';

import { SparkleIcon, TranslateIcon } from '@phosphor-icons/react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/button';
import { compactFieldClassName, textareaClassName } from '@/components/ui/field';

type TranslationSuggestion = {
  id: string;
  entityType: 'category' | 'item' | 'modifier_group' | 'modifier';
  sourceName: string;
  sourceDescription: string | null;
  suggestedName: string;
  suggestedDescription: string | null;
  decision: 'pending' | 'accepted' | 'edited' | 'rejected';
};

type TranslationView = {
  job: {
    id: string;
    status: 'queued' | 'processing' | 'needs_review' | 'applied' | 'failed';
    sourceLocale: string;
    targetLocale: string;
    progress: number;
    errorCode: string | null;
  };
  suggestions: TranslationSuggestion[];
};

type TranslationDraft = Record<string, { selected: boolean; name: string; description: string }>;

export function MenuTranslationPanel({
  storeId,
  targetLocale,
  canUseAi,
}: {
  storeId: string;
  targetLocale: string;
  canUseAi: boolean;
}) {
  const t = useTranslations('menu');
  const locale = useLocale();
  const [view, setView] = useState<TranslationView | null>(null);
  const [usage, setUsage] = useState({ used: 0, limit: 20 });
  const [draft, setDraft] = useState<TranslationDraft>({});
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const languageNames = useMemo(
    () => new Intl.DisplayNames([locale], { type: 'language' }),
    [locale],
  );

  const load = useCallback(async () => {
    if (!canUseAi) return;
    const response = await fetch(`/api/owner/stores/${storeId}/menu-translations`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      setError(t('translationLoadFailed'));
      return;
    }
    const data = (await response.json()) as {
      view: TranslationView | null;
      usage: { used: number; limit: number };
    };
    const next = data.view;
    setView(next);
    setUsage(data.usage);
    if (next?.job.status === 'needs_review') {
      setDraft(
        Object.fromEntries(
          next.suggestions.map((suggestion) => [
            suggestion.id,
            {
              selected: suggestion.decision !== 'rejected',
              name: suggestion.suggestedName,
              description: suggestion.suggestedDescription ?? '',
            },
          ]),
        ),
      );
    }
  }, [canUseAi, storeId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const status = view?.job.status;
    if (status !== 'queued' && status !== 'processing') return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [load, view?.job.status]);

  function errorMessage(code?: string) {
    if (code === 'NOTHING_TO_TRANSLATE') return t('translationNothingMissing');
    if (code === 'LOCALE_LIMIT_REACHED') return t('translationLocaleLimit');
    if (code === 'SAME_LANGUAGE') return t('translationSameLanguage');
    if (code === 'MENU_TOO_LARGE') return t('translationMenuTooLarge');
    if (code === 'MONTHLY_LIMIT_REACHED') return t('translationMonthlyLimitReached');
    return t('translationFailed');
  }

  async function createTranslation() {
    setBusyAction('create');
    setError(null);
    try {
      const response = await fetch(`/api/owner/stores/${storeId}/menu-translations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLocale }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(errorMessage(data?.error));
        return;
      }
      await load();
    } finally {
      setBusyAction(null);
    }
  }

  function updateDraft(id: string, patch: Partial<TranslationDraft[string]>) {
    setDraft((current) => ({ ...current, [id]: { ...current[id]!, ...patch } }));
  }

  async function applyTranslation() {
    if (!view) return;
    const suggestions = view.suggestions.map((suggestion) => ({
      id: suggestion.id,
      selected: draft[suggestion.id]?.selected ?? false,
      name: draft[suggestion.id]?.name.trim() ?? suggestion.suggestedName,
      description: draft[suggestion.id]?.description.trim() || null,
    }));
    if (suggestions.some((suggestion) => suggestion.selected && !suggestion.name)) {
      setError(t('translationNameRequired'));
      return;
    }
    setBusyAction('apply');
    setError(null);
    try {
      const reviewed = await fetch(
        `/api/owner/stores/${storeId}/menu-translations/${view.job.id}/review`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suggestions }),
        },
      );
      if (!reviewed.ok) {
        setError(t('translationApplyFailed'));
        return;
      }
      const applied = await fetch(
        `/api/owner/stores/${storeId}/menu-translations/${view.job.id}/apply`,
        { method: 'POST' },
      );
      if (!applied.ok) {
        setError(t('translationApplyFailed'));
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
        <div className="flex items-center gap-2">
          <TranslateIcon className="size-5 text-indigo-700" weight="bold" aria-hidden />
          <h2 className="text-sm font-black text-ink-900">{t('aiTranslate')}</h2>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
            Pro
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t('translationProHint')}</p>
      </section>
    );
  }

  const status = view?.job.targetLocale === targetLocale ? view.job.status : undefined;
  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
      <div className="flex items-center gap-2">
        <SparkleIcon className="size-5 text-indigo-700" weight="fill" aria-hidden />
        <h2 className="text-sm font-black text-ink-900">{t('aiTranslate')}</h2>
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">
          Luna AI
        </span>
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('translationHint')}</p>
      <p className="mt-1 text-xs font-semibold text-indigo-700">
        {t('translationMonthlyUsage', usage)}
      </p>

      {view && (status === 'queued' || status === 'processing') ? (
        <div className="mt-4" role="status">
          <div className="flex justify-between text-sm font-semibold">
            <span>{t(status === 'queued' ? 'translationQueued' : 'translationProcessing')}</span>
            <span>{view.job.progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-indigo-600"
              style={{ width: `${view.job.progress}%` }}
            />
          </div>
        </div>
      ) : null}

      {view && status === 'needs_review' ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-bold text-ink-900">
            {t('translationReviewTitle', {
              language: languageNames.of(view.job.targetLocale) ?? view.job.targetLocale,
            })}
          </p>
          <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
            {view.suggestions.map((suggestion) => {
              const row = draft[suggestion.id];
              if (!row) return null;
              return (
                <label key={suggestion.id} className="block rounded-xl bg-white p-3">
                  <span className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={(event) =>
                        updateDraft(suggestion.id, { selected: event.target.checked })
                      }
                      className="mt-1 size-4 accent-indigo-700"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-muted-foreground">
                        {suggestion.sourceName}
                      </span>
                      <input
                        value={row.name}
                        onChange={(event) =>
                          updateDraft(suggestion.id, { name: event.target.value })
                        }
                        disabled={!row.selected}
                        className={`mt-1 font-semibold ${compactFieldClassName}`}
                      />
                      {suggestion.sourceDescription || row.description ? (
                        <textarea
                          value={row.description}
                          onChange={(event) =>
                            updateDraft(suggestion.id, { description: event.target.value })
                          }
                          disabled={!row.selected}
                          rows={2}
                          className={`mt-2 ${textareaClassName} text-sm`}
                        />
                      ) : null}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <Button
            type="button"
            variant="default"
            size="lg"
            pending={busyAction === 'apply'}
            busy={busyAction !== null}
            onClick={() => void applyTranslation()}
            className="w-full bg-indigo-700 hover:bg-indigo-700/90"
          >
            {t('translationApply')}
          </Button>
        </div>
      ) : null}

      {status === 'failed' ? (
        <p className="mt-4 rounded-xl bg-white p-3 text-sm font-semibold text-brand-600">
          {t('translationFailed')}
        </p>
      ) : null}
      {status === 'applied' ? (
        <p className="mt-4 rounded-xl bg-white p-3 text-sm font-semibold text-jade-700">
          {t('translationApplied')}
        </p>
      ) : null}

      {!status || status === 'failed' || status === 'applied' ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="default"
            size="lg"
            pending={busyAction === 'create'}
            busy={busyAction !== null}
            disabled={usage.used >= usage.limit}
            onClick={() => void createTranslation()}
            className="w-full bg-indigo-700 hover:bg-indigo-700/90"
          >
            {t('translationCreate')}
          </Button>
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm font-semibold text-brand-600">{error}</p> : null}
    </section>
  );
}
