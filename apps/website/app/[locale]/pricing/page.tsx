import {
  formatCurrency,
  getAnnualEquivalentMonthlyPrice,
  getBillingCurrencyForLocale,
  getBillingPrice,
} from '@taomenu/shared';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PricingPlans } from '@/components/pricing-plans';
import { buildPageMetadata } from '@/lib/seo';
import { getAppProSignupUrl, getAppSignupUrl } from '@/lib/site';

type PricingPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PricingPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pricing' });

  return buildPageMetadata(locale, '/pricing', t('title'), t('subtitle'));
}

export default async function PricingPage({ params }: PricingPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pricing');

  // 定价按界面语言映射币种展示，唯一事实来源在 @taomenu/shared
  const currency = getBillingCurrencyForLocale(locale);
  const freePrice = formatCurrency(0, currency, locale);
  const proMonthly = formatCurrency(
    getBillingPrice('pro_plan', currency, 'month'),
    currency,
    locale,
  );
  const proYearly = formatCurrency(getBillingPrice('pro_plan', currency, 'year'), currency, locale);
  const yearlyEquivalent = formatCurrency(
    getAnnualEquivalentMonthlyPrice('pro_plan', currency),
    currency,
    locale,
  );
  const staffSeatPrice = formatCurrency(getBillingPrice('staff_seat', currency), currency, locale);
  const staffAddOn = t('staffAddOn', { price: staffSeatPrice });

  return (
    <div className="pt-6 sm:pt-10">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          {t('title')}
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">{t('subtitle')}</p>
      </div>

      <PricingPlans
        comingSoonLabel={t('comingSoon')}
        intervalLabels={{
          monthly: t('billingMonthly'),
          yearly: t('billingYearly'),
          yearlyBadge: t('billingYearlyBadge'),
          groupLabel: t('billingIntervalLabel'),
        }}
        free={{
          id: 'free',
          name: t('freeName'),
          desc: t('freeDesc'),
          features: [
            { label: t('freeF1'), status: 'available' },
            { label: t('freeF2'), status: 'available' },
            { label: t('freeF3'), status: 'available' },
            { label: t('freeF4'), status: 'available' },
            { label: staffAddOn, status: 'available' },
          ],
          highlight: false,
          ctaLabel: t('cta'),
          ctaHref: getAppSignupUrl(),
        }}
        freePrice={freePrice}
        pro={{
          id: 'pro',
          name: t('proName'),
          desc: t('proDesc'),
          features: [
            { label: t('proF1'), status: 'available' },
            { label: t('proF2'), status: 'available' },
            { label: t('proImport'), status: 'available' },
            { label: t('proQr'), status: 'available' },
            { label: t('proTranslation'), status: 'available' },
            { label: t('proVoice'), status: 'available' },
            { label: t('proEnhance'), status: 'available' },
            { label: t('proBranding'), status: 'available' },
            { label: staffAddOn, status: 'available' },
          ],
          highlight: true,
          ctaLabel: t('proCta'),
          ctaHref: getAppProSignupUrl(),
          ctaNote: t('proCtaNote'),
        }}
        proMonthlyPrice={t('proPrice', { price: proMonthly })}
        proYearlyPrice={t('proPriceYear', { price: proYearly })}
        yearlyHint={t('yearlyHint', { price: yearlyEquivalent })}
      />

      <section className="mt-10 rounded-2xl border border-border bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-extrabold text-ink-900">{t('aiHowTitle')}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {t('aiHowSubtitle')}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {(['aiInput', 'aiOutput', 'aiReview'] as const).map((key) => (
            <article key={key} className="rounded-xl bg-paper-50 p-4">
              <h3 className="font-bold text-ink-900">{t(`${key}Title`)}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(`${key}Body`)}</p>
            </article>
          ))}
        </div>
        <p className="mt-5 text-sm font-semibold text-ink-900">{t('aiLimit')}</p>
      </section>
    </div>
  );
}
