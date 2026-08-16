'use client';

import type { StoreRow } from '@taomenu/db';
import {
  BILLING_CURRENCIES,
  type BillingCurrency,
  formatCurrency,
  getBillingPrice,
  toBillingCurrency,
} from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/button';
import { FieldSwitch } from '@/components/field-switch';
import { fieldClassName } from '@/components/ui/field';

type StoreSettingsFormProps = {
  store: StoreRow;
  upgradeUrl: string;
  billingStatus?: string;
};

export function StoreSettingsForm({ store, upgradeUrl, billingStatus }: StoreSettingsFormProps) {
  const t = useTranslations('owner');
  const locale = useLocale();
  const [name, setName] = useState(store.name);
  const [serviceMode, setServiceMode] = useState(store.serviceMode);
  const [timezone, setTimezone] = useState(store.timezone);
  const [currency, setCurrency] = useState<BillingCurrency>(toBillingCurrency(store.currency));
  const [acceptingPublicRequests, setAcceptingPublicRequests] = useState(
    store.acceptingPublicRequests,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  // 已有 Stripe 订阅时，改币种不会影响既有扣款，需要额外提示
  const hasSubscription = Boolean(
    store.stripePlanSubscriptionId || store.stripeStaffSeatSubscriptionId,
  );
  // 结算按已保存的门店币种进行，所以价格展示也用 store.currency 而非未保存的表单值
  const billingCurrency = toBillingCurrency(store.currency);
  const proPrice = formatCurrency(
    getBillingPrice('pro_plan', billingCurrency),
    billingCurrency,
    locale,
  );

  async function openBilling(path: 'pro/checkout' | 'portal') {
    setBillingBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/owner/stores/${store.id}/billing/${path}`, {
        method: 'POST',
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        url?: string;
      } | null;
      if (!response.ok || !data?.url) {
        setError(
          data?.error === 'BILLING_NOT_CONFIGURED'
            ? t('billingNotConfigured')
            : t('planBillingFailed'),
        );
        return;
      }
      window.location.assign(data.url);
    } finally {
      setBillingBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/owner/stores/${store.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, serviceMode, timezone, currency, acceptingPublicRequests }),
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
              className={`mt-2 ${fieldClassName}`}
            />
          </label>
          <label className="block text-sm font-bold text-ink-900">
            {t('serviceMode')}
            <select
              value={serviceMode}
              onChange={(event) => setServiceMode(event.target.value as StoreRow['serviceMode'])}
              className={`mt-2 ${fieldClassName}`}
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
              className={`mt-2 ${fieldClassName}`}
            />
          </label>
          <label className="block text-sm font-bold text-ink-900">
            {t('currency')}
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value as BillingCurrency)}
              className={`mt-2 ${fieldClassName}`}
            >
              {BILLING_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">{t('currencyChangeHint')}</p>
        {hasSubscription ? (
          <p className="mt-2 rounded-xl bg-brand-50 px-3 py-2 text-xs leading-5 text-brand-700">
            {t('currencyBillingHint')}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="text-lg font-black text-ink-900">{t('orderingStatus')}</h2>
        <FieldSwitch
          className="mt-4"
          label={t('acceptingOrders')}
          checked={acceptingPublicRequests}
          onCheckedChange={setAcceptingPublicRequests}
        />
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

      <section className="rounded-2xl border border-violet-600/30 bg-violet-600/5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-ink-900">
                {store.plan === 'pro' ? t('proActiveTitle') : t('upgradeTitle')}
              </h2>
              <span className="rounded-full bg-violet-600 px-2.5 py-1 text-xs font-black text-white">
                PRO
              </span>
            </div>
            <p className="mt-1 max-w-xl text-sm leading-5 text-muted-foreground">
              {store.plan === 'pro' ? t('proActiveSubtitle') : t('upgradeSubtitle')}
            </p>
          </div>
          <p className="shrink-0 text-xl font-black tabular-nums text-ink-900">
            {t('proPrice', { price: proPrice })}
          </p>
        </div>

        <ul className="mt-5 grid gap-2 text-sm font-semibold text-ink-900 sm:grid-cols-2">
          <li>✓ {t('proBenefitStaff')}</li>
          <li>✓ {t('proBenefitLanguages')}</li>
          <li>✓ {t('proBenefitImport')}</li>
          <li>✓ {t('proBenefitQr')}</li>
          <li>✓ {t('proBenefitTranslation')}</li>
          <li>✓ {t('proBenefitVoice')}</li>
          <li>✓ {t('proBenefitEnhance')}</li>
        </ul>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">{t('aiReviewRule')}</p>

        {billingStatus === 'success' ? (
          <p className="mt-4 text-sm font-semibold text-jade-700" role="status">
            {t('planBillingSuccess')}
          </p>
        ) : null}
        {billingStatus === 'cancel' ? (
          <p className="mt-4 text-sm font-semibold text-muted-foreground" role="status">
            {t('planBillingCancelled')}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {store.plan === 'free' ? (
            <Button
              type="button"
              pending={billingBusy}
              onClick={() => void openBilling('pro/checkout')}
              className="min-h-12 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white"
            >
              {t('upgradeNow')}
            </Button>
          ) : store.stripeCustomerId ? (
            <Button
              type="button"
              pending={billingBusy}
              onClick={() => void openBilling('portal')}
              className="min-h-12 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white"
            >
              {t('manageBilling')}
            </Button>
          ) : null}
          <a
            href={upgradeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-violet-600/30 px-5 text-sm font-bold text-violet-700"
          >
            {t('viewPlanDetails')}
          </a>
        </div>
      </section>

      {error ? <p className="text-sm font-semibold text-brand-600">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-jade-600">{message}</p> : null}
      <Button type="submit" variant="default" size="lg" pending={busy} className="w-full sm:w-auto">
        {t('saveSettings')}
      </Button>
    </form>
  );
}
