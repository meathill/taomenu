import { CheckIcon } from '@phosphor-icons/react/dist/ssr';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getAppSignupUrl } from '@/lib/site';

type PricingPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function PricingPage({ params }: PricingPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pricing');

  const plans = [
    {
      name: t('freeName'),
      price: t('freePrice'),
      desc: t('freeDesc'),
      features: [t('freeF1'), t('freeF2'), t('freeF3'), t('staffAddOn')],
      highlight: false,
    },
    {
      name: t('proName'),
      price: t('proPrice'),
      desc: t('proDesc'),
      features: [t('proF1'), t('proF2'), t('proF3'), t('staffAddOn')],
      highlight: true,
    },
  ];

  return (
    <div className="pt-6 sm:pt-10">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          {t('title')}
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">{t('subtitle')}</p>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={
              plan.highlight
                ? 'rounded-2xl border-2 border-brand-600 bg-white p-6 shadow-sm'
                : 'rounded-2xl border border-border bg-white p-6 shadow-sm'
            }
          >
            <h2 className="text-xl font-bold text-ink-900">{plan.name}</h2>
            <p className="mt-2 text-3xl font-extrabold tabular-nums text-ink-900">{plan.price}</p>
            <p className="mt-2 text-sm text-muted-foreground">{plan.desc}</p>
            <ul className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-ink-900">
                  <CheckIcon className="mt-0.5 size-5 shrink-0 text-jade-600" weight="bold" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <a
              href={getAppSignupUrl()}
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700"
            >
              {t('cta')}
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
