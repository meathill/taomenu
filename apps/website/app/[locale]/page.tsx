import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr';
import {
  getBillingCurrencyForLocale,
  getBillingPrice,
  minorAmountToDecimalString,
} from '@taomenu/shared';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { getAppSignupUrl } from '@/lib/site';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  // 结构化数据的报价也按界面语言映射币种，与定价页保持一致
  const currency = getBillingCurrencyForLocale(locale);

  const features = [
    { title: t('feature1Title'), body: t('feature1Body') },
    { title: t('feature2Title'), body: t('feature2Body') },
    { title: t('feature3Title'), body: t('feature3Body') },
  ];

  return (
    <div className="pt-6 sm:pt-12">
      <div className="max-w-2xl">
        <p className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
          {t('badge')}
        </p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
          {t('title')}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t('subtitle')}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href={getAppSignupUrl()}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-base font-bold text-white hover:bg-brand-700"
          >
            {t('primaryCta')}
          </a>
          <Link
            href="/pricing"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-white px-5 py-3 text-base font-bold text-ink-900 hover:bg-brand-50"
          >
            {t('secondaryCta')}
          </Link>
        </div>
      </div>

      <ul className="mt-14 grid gap-4 sm:grid-cols-3">
        {features.map((feature) => (
          <li
            key={feature.title}
            className="rounded-2xl border border-border bg-white p-5 shadow-sm"
          >
            <CheckCircleIcon className="size-7 text-gold-600" weight="fill" aria-hidden />
            <h2 className="mt-3 text-lg font-bold text-ink-900">{feature.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
          </li>
        ))}
      </ul>

      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD for SEO
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'TaoMenu',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            offers: [
              {
                '@type': 'Offer',
                name: 'Free',
                price: minorAmountToDecimalString(0, currency),
                priceCurrency: currency,
              },
              {
                '@type': 'Offer',
                name: 'Pro',
                price: minorAmountToDecimalString(getBillingPrice('pro_plan', currency), currency),
                priceCurrency: currency,
              },
            ],
            description: t('subtitle'),
          }),
        }}
      />
    </div>
  );
}
