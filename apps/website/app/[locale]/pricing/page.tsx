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
      features: [
        { label: t('freeF1'), status: 'available' },
        { label: t('freeF2'), status: 'available' },
        { label: t('freeF3'), status: 'available' },
        { label: t('staffAddOn'), status: 'available' },
      ],
      highlight: false,
    },
    {
      name: t('proName'),
      price: t('proPrice'),
      desc: t('proDesc'),
      features: [
        { label: t('proF1'), status: 'available' },
        { label: t('proF2'), status: 'available' },
        { label: t('proImport'), status: 'available' },
        { label: t('proQr'), status: 'available' },
        { label: t('proTranslation'), status: 'comingSoon' },
        { label: t('proVoice'), status: 'available' },
        { label: t('proEnhance'), status: 'comingSoon' },
        { label: t('staffAddOn'), status: 'available' },
      ],
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
                <li key={feature.label} className="flex items-start gap-2 text-sm text-ink-900">
                  <CheckIcon className="mt-0.5 size-5 shrink-0 text-jade-600" weight="bold" />
                  <span>
                    {feature.label}
                    {feature.status === 'comingSoon' ? (
                      <span className="ml-2 inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[0.6875rem] font-bold text-indigo-700">
                        {t('comingSoon')}
                      </span>
                    ) : null}
                  </span>
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
