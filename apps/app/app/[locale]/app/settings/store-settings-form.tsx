'use client';

import type { StoreRow } from '@taomenu/db';
import { useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/button';

type StoreSettingsFormProps = {
  store: StoreRow;
};

export function StoreSettingsForm({ store }: StoreSettingsFormProps) {
  const t = useTranslations('owner');
  const [name, setName] = useState(store.name);
  const [serviceMode, setServiceMode] = useState(store.serviceMode);
  const [timezone, setTimezone] = useState(store.timezone);
  const [acceptingPublicRequests, setAcceptingPublicRequests] = useState(
    store.acceptingPublicRequests,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/owner/stores/${store.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, serviceMode, timezone, acceptingPublicRequests }),
      });
      if (!response.ok) {
        setError(t('settingsSaveFailed'));
        return;
      }
      setMessage(t('settingsSaved'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="max-w-3xl space-y-6">
      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="text-lg font-black text-ink-900">{t('storeDetails')}</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-bold text-ink-900 sm:col-span-2">
            {t('storeName')}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-border px-3 text-base outline-none ring-jade-600 focus:ring-2"
            />
          </label>
          <label className="block text-sm font-bold text-ink-900">
            {t('serviceMode')}
            <select
              value={serviceMode}
              onChange={(event) => setServiceMode(event.target.value as StoreRow['serviceMode'])}
              className="mt-2 min-h-12 w-full rounded-xl border border-border bg-white px-3 text-base outline-none ring-jade-600 focus:ring-2"
            >
              <option value="table_service">{t('modeDineIn')}</option>
              <option value="counter_pickup">{t('modeCounter')}</option>
              <option value="hybrid">{t('modeHybrid')}</option>
            </select>
          </label>
          <label className="block text-sm font-bold text-ink-900">
            {t('timezone')}
            <input
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-border px-3 text-base outline-none ring-jade-600 focus:ring-2"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="text-lg font-black text-ink-900">{t('orderingStatus')}</h2>
        <label className="mt-4 flex min-h-12 items-center gap-3 text-sm font-semibold text-ink-900">
          <input
            type="checkbox"
            checked={acceptingPublicRequests}
            onChange={(event) => setAcceptingPublicRequests(event.target.checked)}
            className="size-5 accent-jade-600"
          />
          {t('acceptingOrders')}
        </label>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{t('acceptingOrdersHint')}</p>
      </section>

      <section className="rounded-2xl border border-border bg-paper-50 p-5">
        <h2 className="text-lg font-black text-ink-900">{t('readOnlyDetails')}</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{t('planLabel')}</dt>
            <dd className="mt-1 font-bold text-ink-900">{store.plan.toUpperCase()}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('currency')}</dt>
            <dd className="mt-1 font-bold text-ink-900">{store.currency}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('baseLanguage')}</dt>
            <dd className="mt-1 font-bold text-ink-900">{store.baseLocale}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('storeSlug')}</dt>
            <dd className="mt-1 break-all font-bold text-ink-900">{store.slug}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">{t('readOnlyHint')}</p>
      </section>

      {error ? <p className="text-sm font-semibold text-brand-600">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-jade-600">{message}</p> : null}
      <Button
        type="submit"
        pending={busy}
        className="min-h-12 w-full rounded-xl bg-jade-600 text-base font-bold text-white sm:w-auto sm:px-6"
      >
        {t('saveSettings')}
      </Button>
    </form>
  );
}
