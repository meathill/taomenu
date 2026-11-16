'use client';

import type { StoreRow, StoreSocialOnboarding } from '@taomenu/db';
import {
  BILLING_PROMOS,
  type BillingInterval,
  formatCurrency,
  formatPromoEndDate,
  getAnnualEquivalentMonthlyPrice,
  getBillingCurrencyForStore,
  getBillingPrice,
  getChristmasProAnnualPrice,
  hasProEntitlements,
  isChristmasPromoActive,
  isProPlusEarlyBirdActive,
  isProPlusPlan,
  promoDaysRemaining,
  STORE_CURRENCIES,
  type StoreCurrency,
  toStoreCurrency,
} from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/button';
import { FieldSwitch } from '@/components/field-switch';
import { BillingIntervalToggle } from '@/components/paywall/billing-interval-toggle';
import { ProBadge } from '@/components/paywall/pro-badge';
import { TimeZoneSelect } from '@/components/time-zone-select';
import { fieldClassName } from '@/components/ui/field';
import { type BillingPath, requestBillingUrl } from '@/lib/billing-client';
import { planLabelKey } from '@/lib/plan-label';
import { ProPlusOnboardingForm } from './pro-plus-onboarding-form';
import { StoreBrandingSection } from './store-branding-section';

type StoreSettingsFormProps = {
  store: StoreRow;
  /** issue #26：顾客页是否已隐藏 Powered by */
  hidePoweredBy: boolean;
  coverImageKey: string | null;
  upgradeUrl: string;
  billingStatus?: string;
  /** 从定价页付费入口过来：滚动到并高亮升级区块 */
  isUpgradeIntent?: boolean;
  upgradeIntent?: 'pro' | 'pro-plus';
  socialOnboarding?: StoreSocialOnboarding;
};

export function StoreSettingsForm({
  store,
  hidePoweredBy,
  coverImageKey,
  upgradeUrl,
  billingStatus,
  isUpgradeIntent = false,
  upgradeIntent,
  socialOnboarding,
}: StoreSettingsFormProps) {
  const t = useTranslations('owner');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [name, setName] = useState(store.name);
  const [serviceMode, setServiceMode] = useState(store.serviceMode);
  const [timezone, setTimezone] = useState(store.timezone);
  const [currency, setCurrency] = useState<StoreCurrency>(toStoreCurrency(store.currency));
  const [acceptingPublicRequests, setAcceptingPublicRequests] = useState(
    store.acceptingPublicRequests,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('year');
  const upgradeSectionRef = useRef<HTMLElement>(null);
  const shouldHighlightUpgrade =
    isUpgradeIntent &&
    (store.plan === 'free' || (store.plan === 'pro' && upgradeIntent === 'pro-plus'));

  useEffect(() => {
    if (shouldHighlightUpgrade) {
      upgradeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [shouldHighlightUpgrade]);
  // 已有 Stripe 订阅时，改币种不会影响既有扣款，需要额外提示
  const hasSubscription = Boolean(
    store.stripePlanSubscriptionId || store.stripeStaffSeatSubscriptionId,
  );
  // 结算按已保存的门店币种进行，所以价格展示也用 store.currency 而非未保存的表单值
  // 非计费币种（如 EUR）的门店按 USD 结算
  const billingCurrency = getBillingCurrencyForStore(store.currency);
  const proPrice = formatCurrency(
    getBillingPrice('pro_plan', billingCurrency, billingInterval),
    billingCurrency,
    locale,
  );
  const yearlyEquivalent = formatCurrency(
    getAnnualEquivalentMonthlyPrice('pro_plan', billingCurrency),
    billingCurrency,
    locale,
  );
  const proPriceLabel =
    billingInterval === 'year'
      ? t('proPriceYear', { price: proPrice })
      : t('proPrice', { price: proPrice });
  const proPlusPrice = formatCurrency(
    getBillingPrice('pro_plus_plan', billingCurrency, billingInterval),
    billingCurrency,
    locale,
  );
  const proPlusYearlyEquivalent = formatCurrency(
    getAnnualEquivalentMonthlyPrice('pro_plus_plan', billingCurrency),
    billingCurrency,
    locale,
  );
  const proPlusPriceLabel =
    billingInterval === 'year'
      ? t('proPlusPriceYear', { price: proPlusPrice })
      : t('proPlusPrice', { price: proPlusPrice });
  const christmasActive = isChristmasPromoActive();
  const earlyBirdActive = isProPlusEarlyBirdActive();
  const countdownFor = (endDate: string) => {
    const days = promoDaysRemaining(endDate);
    return days === 0 ? t('promoCountdownToday') : t('promoCountdownDays', { count: days });
  };
  const christmasBanner = christmasActive
    ? t('promoChristmasBanner', {
        date: formatPromoEndDate(BILLING_PROMOS.christmas.endDate, locale),
        countdown: countdownFor(BILLING_PROMOS.christmas.endDate),
      })
    : null;
  const earlyBirdLabel = earlyBirdActive
    ? t('promoEarlyBirdUntil', {
        date: formatPromoEndDate(BILLING_PROMOS.proPlusEarlyBird.endDate, locale),
        countdown: countdownFor(BILLING_PROMOS.proPlusEarlyBird.endDate),
      })
    : null;
  const christmasYearlyPrice = formatCurrency(
    getChristmasProAnnualPrice(billingCurrency),
    billingCurrency,
    locale,
  );
  const displayedProPriceLabel =
    christmasActive && billingInterval === 'year'
      ? t('proPriceYear', { price: christmasYearlyPrice })
      : proPriceLabel;
  const displayedProPlusPriceLabel = earlyBirdActive
    ? billingInterval === 'year'
      ? t('proPlusPriceYear', {
          price: formatCurrency(
            getBillingPrice('pro_plan', billingCurrency, 'year'),
            billingCurrency,
            locale,
          ),
        })
      : t('proPlusPrice', {
          price: formatCurrency(
            getBillingPrice('pro_plan', billingCurrency, 'month'),
            billingCurrency,
            locale,
          ),
        })
    : proPlusPriceLabel;

  async function openBilling(path: BillingPath) {
    setBillingBusy(true);
    setMessage(null);
    setError(null);
    const result = await requestBillingUrl(store.id, path, {
      locale,
      interval: path === 'portal' ? undefined : billingInterval,
    });
    if (result.ok) {
      window.location.assign(result.url);
      return;
    }
    setBillingBusy(false);
    setError(
      result.error === 'BILLING_NOT_CONFIGURED'
        ? t('billingNotConfigured')
        : t('planBillingFailed'),
    );
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
          <label className="block text-sm font-bold text-ink-900" htmlFor="store-timezone">
            {t('timezone')}
            <TimeZoneSelect
              id="store-timezone"
              value={timezone}
              onChange={setTimezone}
              className={`mt-2 ${fieldClassName}`}
            />
          </label>
          <label className="block text-sm font-bold text-ink-900">
            {t('currency')}
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value as StoreCurrency)}
              className={`mt-2 ${fieldClassName}`}
            >
              {STORE_CURRENCIES.map((code) => (
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

      <StoreBrandingSection
        store={store}
        initialHidePoweredBy={hidePoweredBy}
        initialCoverImageKey={coverImageKey}
      />

      <section className="rounded-2xl border border-border bg-paper-50 p-5">
        <h2 className="text-lg font-black text-ink-900">{t('readOnlyDetails')}</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{t('planLabel')}</dt>
            <dd className="mt-1 font-bold text-ink-900">{tCommon(planLabelKey(store.plan))}</dd>
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

      <section
        ref={upgradeSectionRef}
        id="upgrade"
        className={`scroll-mt-20 rounded-2xl border border-violet-600/30 bg-violet-600/5 p-5 ${
          shouldHighlightUpgrade ? 'ring-2 ring-violet-600 ring-offset-2' : ''
        }`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-ink-900">
                {isProPlusPlan(store.plan)
                  ? t('proPlusActiveTitle')
                  : store.plan === 'pro'
                    ? t('proActiveTitle')
                    : t('upgradeTitle')}
              </h2>
              <ProBadge />
            </div>
            <p className="mt-1 max-w-xl text-sm leading-5 text-muted-foreground">
              {isProPlusPlan(store.plan)
                ? t('proPlusActiveSubtitle')
                : store.plan === 'pro'
                  ? t('proActiveSubtitle')
                  : t('upgradeSubtitle')}
            </p>
          </div>
          {store.plan !== 'pro_plus' ? (
            <div className="shrink-0 sm:text-right">
              <BillingIntervalToggle
                value={billingInterval}
                onChange={setBillingInterval}
                monthlyLabel={t('billingMonthly')}
                yearlyLabel={t('billingYearly')}
                yearlyBadge={t('billingYearlyBadge')}
                groupLabel={t('billingIntervalLabel')}
              />
            </div>
          ) : null}
        </div>
        {christmasBanner ? (
          <p className="mt-4 rounded-xl bg-white px-3 py-2 text-sm font-medium leading-6 text-ink-900">
            {christmasBanner}
          </p>
        ) : null}

        {store.plan === 'free' ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <article className="rounded-xl border border-violet-600/20 bg-white p-4">
              <h3 className="text-base font-black text-ink-900">{tCommon('planPro')}</h3>
              {christmasActive && billingInterval === 'year' ? (
                <p className="text-sm text-muted-foreground line-through tabular-nums">
                  {proPriceLabel}
                </p>
              ) : null}
              <p className="mt-2 text-xl font-black tabular-nums text-ink-900">
                {displayedProPriceLabel}
              </p>
              {christmasActive ? (
                <p className="mt-1 text-sm font-semibold text-jade-700">
                  {billingInterval === 'year'
                    ? t('promoChristmasYearly')
                    : t('promoChristmasMonthly')}
                </p>
              ) : billingInterval === 'year' ? (
                <p className="mt-1 text-sm font-medium text-jade-700">
                  {t('yearlyHint', { price: yearlyEquivalent })}
                </p>
              ) : null}
              <ul className="mt-3 grid gap-1.5 text-sm font-semibold text-ink-900">
                <li>✓ {t('proBenefitStaff')}</li>
                <li>✓ {t('proBenefitLanguages')}</li>
                <li>✓ {t('proBenefitImport')}</li>
                <li>✓ {t('proBenefitQr')}</li>
                <li>✓ {t('proBenefitTranslation')}</li>
                <li>✓ {t('proBenefitVoice')}</li>
                <li>✓ {t('proBenefitEnhance')}</li>
                <li>✓ {t('proBenefitBranding')}</li>
              </ul>
              <Button
                type="button"
                pending={billingBusy}
                onClick={() => void openBilling('pro/checkout')}
                className="mt-4 min-h-12 w-full rounded-xl border border-violet-600/30 bg-white px-5 text-sm font-bold text-violet-700"
              >
                {t('upgradeNow')}
              </Button>
            </article>
            <article className="rounded-xl border-2 border-violet-600 bg-white p-4">
              <h3 className="text-base font-black text-ink-900">{tCommon('planProPlus')}</h3>
              {earlyBirdActive ? (
                <p className="text-sm text-muted-foreground line-through tabular-nums">
                  {proPlusPriceLabel}
                </p>
              ) : null}
              <p className="mt-2 text-xl font-black tabular-nums text-ink-900">
                {displayedProPlusPriceLabel}
              </p>
              {earlyBirdLabel ? (
                <p className="mt-1 text-sm font-medium text-jade-700">{earlyBirdLabel}</p>
              ) : null}
              {billingInterval === 'year' ? (
                <p className="mt-1 text-sm font-medium text-jade-700">
                  {t(earlyBirdActive ? 'yearlyHint' : 'proPlusYearlyHint', {
                    price: earlyBirdActive ? yearlyEquivalent : proPlusYearlyEquivalent,
                  })}
                </p>
              ) : null}
              <ul className="mt-3 grid gap-1.5 text-sm font-semibold text-ink-900">
                <li>✓ {t('proPlusBenefitAllPro')}</li>
                <li>✓ {t('proPlusBenefitManage')}</li>
                <li>✓ {t('proPlusBenefitAuto')}</li>
                <li>✓ {t('proPlusBenefitPrepare')}</li>
              </ul>
              <Button
                type="button"
                pending={billingBusy}
                onClick={() => void openBilling('pro-plus/checkout')}
                className="mt-4 min-h-12 w-full rounded-xl bg-violet-600 px-5 text-sm font-bold text-white"
              >
                {t('upgradeToProPlus')}
              </Button>
            </article>
          </div>
        ) : null}

        {store.plan === 'pro' ? (
          <div className="mt-5">
            <ul className="grid gap-2 text-sm font-semibold text-ink-900 sm:grid-cols-2">
              <li>✓ {t('proBenefitStaff')}</li>
              <li>✓ {t('proBenefitLanguages')}</li>
              <li>✓ {t('proBenefitImport')}</li>
              <li>✓ {t('proBenefitQr')}</li>
              <li>✓ {t('proBenefitTranslation')}</li>
              <li>✓ {t('proBenefitVoice')}</li>
              <li>✓ {t('proBenefitEnhance')}</li>
              <li>✓ {t('proBenefitBranding')}</li>
            </ul>
            <article className="mt-4 rounded-xl border-2 border-violet-600 bg-white p-4">
              <h3 className="text-base font-black text-ink-900">{tCommon('planProPlus')}</h3>
              {earlyBirdActive ? (
                <p className="text-sm text-muted-foreground line-through tabular-nums">
                  {proPlusPriceLabel}
                </p>
              ) : null}
              <p className="mt-2 text-xl font-black tabular-nums text-ink-900">
                {displayedProPlusPriceLabel}
              </p>
              {earlyBirdLabel ? (
                <p className="mt-1 text-sm font-medium text-jade-700">{earlyBirdLabel}</p>
              ) : null}
              {billingInterval === 'year' ? (
                <p className="mt-1 text-sm font-medium text-jade-700">
                  {t(earlyBirdActive ? 'yearlyHint' : 'proPlusYearlyHint', {
                    price: earlyBirdActive ? yearlyEquivalent : proPlusYearlyEquivalent,
                  })}
                </p>
              ) : null}
              <ul className="mt-3 grid gap-1.5 text-sm font-semibold text-ink-900">
                <li>✓ {t('proPlusBenefitManage')}</li>
                <li>✓ {t('proPlusBenefitAuto')}</li>
                <li>✓ {t('proPlusBenefitPrepare')}</li>
              </ul>
              <Button
                type="button"
                pending={billingBusy}
                onClick={() => void openBilling('pro-plus/checkout')}
                className="mt-4 min-h-12 w-full rounded-xl bg-violet-600 px-5 text-sm font-bold text-white sm:w-auto"
              >
                {t('upgradeToProPlus')}
              </Button>
            </article>
          </div>
        ) : null}

        {isProPlusPlan(store.plan) ? (
          <div className="mt-5">
            <ul className="grid gap-2 text-sm font-semibold text-ink-900 sm:grid-cols-2">
              <li>✓ {t('proPlusBenefitAllPro')}</li>
              <li>✓ {t('proPlusBenefitManage')}</li>
              <li>✓ {t('proPlusBenefitAuto')}</li>
              <li>✓ {t('proPlusBenefitPrepare')}</li>
            </ul>
            {socialOnboarding ? (
              <ProPlusOnboardingForm storeId={store.id} initial={socialOnboarding} />
            ) : null}
          </div>
        ) : null}

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
          {hasProEntitlements(store.plan) && store.stripeCustomerId ? (
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
