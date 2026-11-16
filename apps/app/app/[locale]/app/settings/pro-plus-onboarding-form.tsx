'use client';

import type { StoreSocialOnboarding } from '@taomenu/db';
import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/button';
import { fieldClassName } from '@/components/ui/field';

type ProPlusOnboardingFormProps = {
  storeId: string;
  initial: StoreSocialOnboarding;
};

const FIELDS = [
  ['googleMapsUrl', 'proPlusFieldGoogleMaps'],
  ['facebookUrl', 'proPlusFieldFacebook'],
  ['instagramUrl', 'proPlusFieldInstagram'],
  ['tiktokUrl', 'proPlusFieldTikTok'],
  ['tripadvisorUrl', 'proPlusFieldTripadvisor'],
] as const;

export function ProPlusOnboardingForm({ storeId, initial }: ProPlusOnboardingFormProps) {
  const t = useTranslations('owner');
  const [values, setValues] = useState({
    googleMapsUrl: initial.googleMapsUrl,
    facebookUrl: initial.facebookUrl,
    instagramUrl: initial.instagramUrl,
    tiktokUrl: initial.tiktokUrl,
    tripadvisorUrl: initial.tripadvisorUrl,
    notes: initial.notes,
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(Boolean(initial.submittedAt));
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/owner/stores/${storeId}/billing/pro-plus/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        setError(t('proPlusOnboardingFailed'));
        setBusy(false);
        return;
      }
      setSaved(true);
    } catch {
      setError(t('proPlusOnboardingFailed'));
    }
    setBusy(false);
  }

  return (
    <section
      id="pro-plus-onboarding"
      className="mt-5 scroll-mt-20 rounded-xl border border-violet-600/20 bg-white p-4"
    >
      <h3 className="text-base font-black text-ink-900">{t('proPlusNextTitle')}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{t('proPlusNextBody')}</p>
      <form onSubmit={onSubmit} className="mt-4 grid gap-3">
        <p className="text-sm font-semibold text-ink-900">{t('proPlusOnboardingTitle')}</p>
        {FIELDS.map(([field, labelKey]) => (
          <label key={field} className="grid gap-1 text-sm font-medium text-ink-900">
            {t(labelKey)}
            <input
              type="text"
              inputMode="url"
              value={values[field]}
              onChange={(event) =>
                setValues((current) => ({ ...current, [field]: event.target.value }))
              }
              className={fieldClassName}
              placeholder="https://"
            />
          </label>
        ))}
        <label className="grid gap-1 text-sm font-medium text-ink-900">
          {t('proPlusFieldNotes')}
          <textarea
            value={values.notes}
            onChange={(event) =>
              setValues((current) => ({ ...current, notes: event.target.value }))
            }
            className={fieldClassName}
            rows={3}
          />
        </label>
        {saved ? (
          <p className="text-sm font-semibold text-jade-700" role="status">
            {t('proPlusOnboardingSaved')}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm font-semibold text-brand-600" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          pending={busy}
          className="min-h-12 w-full rounded-xl bg-violet-600 px-5 text-sm font-bold text-white sm:w-auto"
        >
          {t('proPlusOnboardingSubmit')}
        </Button>
      </form>
    </section>
  );
}
