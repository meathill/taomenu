'use client';

import { CheckIcon, CrownIcon } from '@phosphor-icons/react';
import type { StoreRow } from '@taomenu/db';
import {
  formatCurrency,
  getBillingCurrencyForStore,
  getBillingPrice,
  PLAN_LIMITS,
} from '@taomenu/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/button';
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { requestBillingUrl } from '@/lib/billing-client';
import { getUpgradeSettingsHref, type PaywallFeature } from './paywall-features';

type PaywallDialogProps = {
  store: StoreRow;
  feature: PaywallFeature | null;
  onOpenChange: (open: boolean) => void;
};

const BENEFIT_KEYS = [
  'proBenefitLanguages',
  'proBenefitTranslation',
  'proBenefitImport',
  'proBenefitEnhance',
  'proBenefitQr',
  'proBenefitStaff',
  'proBenefitBranding',
] as const;

const FEATURE_MESSAGE_KEYS = {
  removePoweredBy: 'paywallRemovePoweredBy',
  translation: 'paywallTranslation',
  photoEnhance: 'paywallPhotoEnhance',
  qrTemplates: 'paywallQrTemplates',
  menuImport: 'paywallMenuImport',
  aiTools: 'paywallAiTools',
} as const satisfies Record<PaywallFeature, string>;

/** 文案里的次数、语言数直接取自套餐常量，避免改套餐时忘了改文案 */
const FEATURE_VALUES = {
  free: PLAN_LIMITS.free.maxAiMenuImportsPerMonth,
  pro: PLAN_LIMITS.pro.maxAiMenuImportsPerMonth,
  languages: PLAN_LIMITS.pro.maxMenuLocales,
  freeLanguages: PLAN_LIMITS.free.maxMenuLocales,
  freeTranslations: PLAN_LIMITS.free.maxAiTranslationsPerMonth,
  proTranslations: PLAN_LIMITS.pro.maxAiTranslationsPerMonth,
};

export function PaywallDialog({ store, feature, onOpenChange }: PaywallDialogProps) {
  const t = useTranslations('owner');
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const billingCurrency = getBillingCurrencyForStore(store.currency);
  const proPrice = formatCurrency(
    getBillingPrice('pro_plan', billingCurrency),
    billingCurrency,
    locale,
  );

  async function handleUpgrade() {
    setBusy(true);
    setError(null);
    const result = await requestBillingUrl(store.id, 'pro/checkout', { locale });
    if (result.ok) {
      window.location.assign(result.url);
      return;
    }
    setBusy(false);
    setError(
      result.error === 'BILLING_NOT_CONFIGURED'
        ? t('billingNotConfigured')
        : t('planBillingFailed'),
    );
  }

  return (
    <Dialog open={feature !== null} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-md">
        <DialogHeader>
          <span className="grid size-12 place-items-center rounded-2xl bg-violet-600/10 text-violet-700">
            <CrownIcon className="size-6" weight="fill" aria-hidden />
          </span>
          <DialogTitle className="text-xl font-black text-ink-900">{t('paywallTitle')}</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-muted-foreground">
            {feature ? t(FEATURE_MESSAGE_KEYS[feature], FEATURE_VALUES) : null}
          </DialogDescription>
        </DialogHeader>
        <div className="px-6">
          <p className="text-lg font-black tabular-nums text-ink-900">
            {t('proPrice', { price: proPrice })}
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-ink-900">
            {BENEFIT_KEYS.map((key) => (
              <li key={key} className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-violet-700" weight="bold" />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
          {error ? (
            <p className="mt-3 text-sm font-semibold text-brand-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 p-6 sm:flex-row-reverse">
          <Button
            type="button"
            pending={busy}
            onClick={() => void handleUpgrade()}
            className="min-h-12 flex-1 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white"
          >
            {t('upgradeNow')}
          </Button>
          <a
            href={getUpgradeSettingsHref(store.slug)}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-violet-600/30 px-5 text-sm font-bold text-violet-700"
          >
            {t('paywallComparePlans')}
          </a>
        </div>
      </DialogPopup>
    </Dialog>
  );
}
