import {
  BrowserIcon,
  ChatsIcon,
  CheckCircleIcon,
  CoffeeIcon,
  DesktopTowerIcon,
  DeviceMobileIcon,
  ImageIcon,
  MoneyIcon,
  QrCodeIcon,
  RoadHorizonIcon,
  SmileyIcon,
  StarIcon,
  StorefrontIcon,
  TagIcon,
  TranslateIcon,
} from '@phosphor-icons/react/dist/ssr';
import {
  getBillingCurrencyForLocale,
  getBillingPrice,
  minorAmountToDecimalString,
} from '@taomenu/shared';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { JsonLd } from '@/components/json-ld';
import { Link } from '@/i18n/routing';
import { buildAlternates } from '@/lib/seo';
import { getAppSignupUrl } from '@/lib/site';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: HomePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates(locale, ''),
  };
}

type FaqItem = { q: string; a: string };

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

  const faq: FaqItem[] = [1, 2, 3, 4, 5, 6].map((index) => ({
    q: t(`faq${index}Q`),
    a: t(`faq${index}A`),
  }));

  return (
    <div className="pt-6 sm:pt-12">
      <section className="max-w-2xl">
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
      </section>

      <PainSection t={t} />

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HighlightCard icon={<DesktopTowerIcon className="size-6" aria-hidden />} t={t} index={1} />
        <HighlightCard icon={<BrowserIcon className="size-6" aria-hidden />} t={t} index={2} />
        <HighlightCard icon={<DeviceMobileIcon className="size-6" aria-hidden />} t={t} index={3} />
        <HighlightCard icon={<MoneyIcon className="size-6" aria-hidden />} t={t} index={4} />
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          {t('howTitle')}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t('howSubtitle')}
        </p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((index) => (
            <li
              key={index}
              className="flex gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-base font-extrabold text-white">
                {index}
              </span>
              <div>
                <h3 className="font-bold text-ink-900">{t(`howStep${index}Title`)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t(`howStep${index}Body`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          {t('scenariosTitle')}
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ScenarioCard
            icon={<StorefrontIcon className="size-6" aria-hidden />}
            title={t('scenario1Title')}
            body={t('scenario1Body')}
            href="/phan-mem-order-nha-hang"
          />
          <ScenarioCard
            icon={<CoffeeIcon className="size-6" aria-hidden />}
            title={t('scenario2Title')}
            body={t('scenario2Body')}
            href="/menu-qr-cho-quan-an"
          />
          <ScenarioCard
            icon={<RoadHorizonIcon className="size-6" aria-hidden />}
            title={t('scenario3Title')}
            body={t('scenario3Body')}
            href="/phan-mem-order-tren-dien-thoai"
          />
          <ScenarioCard
            icon={<QrCodeIcon className="size-6" aria-hidden />}
            title={t('scenario4Title')}
            body={t('scenario4Body')}
            href="/phan-mem-order-quan-banh-mi"
          />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {t('moreScenarios')}{' '}
          <Link
            href="/phan-mem-quan-ly-nha-hang-mien-phi"
            className="font-semibold text-brand-700 hover:underline"
          >
            {t('moreScenario1')}
          </Link>
          {' · '}
          <Link href="/menu-da-ngon-ngu" className="font-semibold text-brand-700 hover:underline">
            {t('moreScenario2')}
          </Link>
          {' · '}
          <Link
            href="/goi-nhan-vien-bang-ma-qr"
            className="font-semibold text-brand-700 hover:underline"
          >
            {t('moreScenario3')}
          </Link>
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          {t('beyondTitle')}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t('beyondBody')}
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          <BeyondCard icon={<ImageIcon className="size-6" aria-hidden />} t={t} index={1} />
          <BeyondCard icon={<TagIcon className="size-6" aria-hidden />} t={t} index={2} />
          <BeyondCard icon={<StarIcon className="size-6" aria-hidden />} t={t} index={3} />
        </ul>
      </section>

      <FaqSection faq={faq} title={t('faqTitle')} />

      <section className="mt-14 rounded-2xl border border-border bg-white p-6 text-center sm:p-10">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          {t('finalCtaTitle')}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t('finalCtaBody')}
        </p>
        <a
          href={getAppSignupUrl()}
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-600 px-6 py-3 text-base font-bold text-white hover:bg-brand-700"
        >
          {t('finalCtaPrimary')}
        </a>
      </section>

      <JsonLd
        data={{
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
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        }}
      />
    </div>
  );
}

function PainSection({ t }: { t: Awaited<ReturnType<typeof getTranslations>> }) {
  const pains = [
    { icon: <TranslateIcon className="size-6" aria-hidden />, index: 1 },
    { icon: <ChatsIcon className="size-6" aria-hidden />, index: 2 },
    { icon: <SmileyIcon className="size-6" aria-hidden />, index: 3 },
  ];

  return (
    <section className="mt-12 rounded-2xl bg-brand-50 p-6 sm:p-8">
      <h2 className="text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl">
        {t('painTitle')}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {t('painBody')}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {pains.map((pain) => (
          <div key={pain.index} className="rounded-xl bg-white p-5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-jade-600 text-white">
              {pain.icon}
            </div>
            <h3 className="mt-3 font-bold text-ink-900">{t(`pain${pain.index}Title`)}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {t(`pain${pain.index}Body`)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HighlightCard({
  icon,
  t,
  index,
}: {
  icon: ReactNode;
  t: Awaited<ReturnType<typeof getTranslations>>;
  index: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        {icon}
      </div>
      <h2 className="mt-3 text-base font-bold text-ink-900">{t(`highlight${index}Title`)}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {t(`highlight${index}Body`)}
      </p>
    </div>
  );
}

function ScenarioCard({
  icon,
  title,
  body,
  href,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex h-full flex-col rounded-2xl border border-border bg-white p-5 shadow-sm hover:bg-brand-50"
    >
      <div className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        {icon}
      </div>
      <h3 className="mt-3 font-bold text-ink-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </Link>
  );
}

function BeyondCard({
  icon,
  t,
  index,
}: {
  icon: ReactNode;
  t: Awaited<ReturnType<typeof getTranslations>>;
  index: number;
}) {
  return (
    <li className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex size-11 items-center justify-center rounded-xl bg-violet-600 text-white">
          {icon}
        </div>
        {index > 1 ? (
          <span className="inline-flex rounded-full bg-indigo-100 px-2 py-0.5 text-[0.6875rem] font-bold text-indigo-700">
            {t('comingSoon')}
          </span>
        ) : null}
      </div>
      <h3 className="mt-3 font-bold text-ink-900">{t(`beyond${index}Title`)}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {t(`beyond${index}Body`)}
      </p>
    </li>
  );
}

function FaqSection({ faq, title }: { faq: FaqItem[]; title: string }) {
  return (
    <section className="mt-14">
      <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{title}</h2>
      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {faq.map((item) => (
          <li key={item.q} className="rounded-2xl border border-border bg-white p-5">
            <h3 className="font-bold text-ink-900">{item.q}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
