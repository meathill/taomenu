import {
  BrowserIcon,
  ChatsIcon,
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
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { HeroGallery } from '@/components/hero-gallery';
import { JsonLd } from '@/components/json-ld';
import { PhoneFrame } from '@/components/phone-frame';
import { Link } from '@/i18n/routing';
import {
  HOME_PHONE_SIZE,
  HOME_QR_SIZE,
  homeGuestSrc,
  homeHeroSlides,
  homeOwnerShot,
} from '@/lib/home-screenshots';
import { buildPageMetadata } from '@/lib/seo';
import { getAppSignupUrl, getDemoMenuUrl } from '@/lib/site';

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: HomePageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  return buildPageMetadata(locale, '', t('title'), t('description'));
}

type FaqItem = { q: string; a: string };
type HomeT = Awaited<ReturnType<typeof getTranslations>>;

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  const faq: FaqItem[] = [1, 2, 3, 4, 5, 6].map((index) => ({
    q: t(`faq${index}Q`),
    a: t(`faq${index}A`),
  }));

  return (
    <div className="pt-6 pb-16 sm:pt-12 sm:pb-20">
      <HeroSection t={t} locale={locale} />

      <VisualFeatures t={t} locale={locale} />

      <PainSection t={t} />

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HighlightCard icon={<DesktopTowerIcon className="size-6" aria-hidden />} t={t} index={1} />
        <HighlightCard icon={<BrowserIcon className="size-6" aria-hidden />} t={t} index={2} />
        <HighlightCard icon={<DeviceMobileIcon className="size-6" aria-hidden />} t={t} index={3} />
        <HighlightCard icon={<MoneyIcon className="size-6" aria-hidden />} t={t} index={4} />
      </section>

      <HowItWorks t={t} locale={locale} />

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
            prefetch={false}
            className="font-semibold text-brand-700 hover:underline"
          >
            {t('moreScenario1')}
          </Link>
          {' · '}
          <Link
            href="/menu-da-ngon-ngu"
            prefetch={false}
            className="font-semibold text-brand-700 hover:underline"
          >
            {t('moreScenario2')}
          </Link>
          {' · '}
          <Link
            href="/goi-nhan-vien-bang-ma-qr"
            prefetch={false}
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

      {/* 无真实评价时不声明 SoftwareApplication，避免富结果缺 rating/review 报错；
          价格只在定价页可见，首页也不写 offers。站点级 WebSite/Organization 见 layout。 */}
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

function HeroSection({ t, locale }: { t: HomeT; locale: string }) {
  const altBySlide = {
    menu: t('altMenu'),
    detail: t('altDetail'),
    cart: t('altCart'),
    orders: t('altOrders'),
    editor: t('altEditor'),
  } as const;
  const tabBySlide = {
    menu: t('heroSlideMenuTab'),
    detail: t('heroSlideDetailTab'),
    cart: t('heroSlideCartTab'),
    orders: t('heroSlideOrdersTab'),
    editor: t('heroSlideEditorTab'),
  } as const;
  const captionBySlide = {
    menu: t('heroSlideMenuCaption'),
    detail: t('heroSlideDetailCaption'),
    cart: t('heroSlideCartCaption'),
    orders: t('heroSlideOrdersCaption'),
    editor: t('heroSlideEditorCaption'),
  } as const;
  const slides = homeHeroSlides(locale).map((slide) => ({
    ...slide,
    alt: altBySlide[slide.id],
    tab: tabBySlide[slide.id],
    caption: captionBySlide[slide.id],
  }));

  return (
    <section className="grid items-start gap-10 lg:grid-cols-2 lg:gap-12">
      <div className="min-w-0">
        <p className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
          {t('badge')}
        </p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-5xl">
          {t('title')}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t('subtitle')}
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href={getAppSignupUrl()}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-base font-bold text-white hover:bg-brand-700"
          >
            {t('primaryCta')}
          </a>
          <Link
            href="/pricing"
            prefetch={false}
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-white px-5 py-3 text-base font-bold text-ink-900 hover:bg-brand-50"
          >
            {t('secondaryCta')}
          </Link>
          <a
            href={getDemoMenuUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center px-1 py-3 text-base font-bold text-brand-700 hover:underline"
          >
            {t('demoCta')}
          </a>
        </div>
      </div>

      <div className="mx-auto w-full min-w-0 max-w-[22rem] sm:max-w-[24rem] lg:max-w-[26rem]">
        <HeroGallery
          slides={slides}
          label={t('heroGalleryLabel')}
          previousLabel={t('heroPrev')}
          nextLabel={t('heroNext')}
        />
      </div>
    </section>
  );
}

function VisualFeatures({ t, locale }: { t: HomeT; locale: string }) {
  const cards = [
    {
      src: homeGuestSrc('menu', locale),
      alt: t('altMenu'),
      title: t('visual1Title'),
      body: t('visual1Body'),
    },
    {
      src: homeGuestSrc('detail', locale),
      alt: t('altDetail'),
      title: t('visual2Title'),
      body: t('visual2Body'),
    },
    {
      src: homeGuestSrc('cart', locale),
      alt: t('altCart'),
      title: t('visual3Title'),
      body: t('visual3Body'),
    },
  ];

  return (
    <section className="mt-14">
      <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
        {t('visualTitle')}
      </h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-3 sm:grid-rows-[auto_auto]">
        {cards.map((card) => (
          <li
            key={card.title}
            className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm sm:row-span-2 sm:grid sm:grid-rows-subgrid"
          >
            <div className="flex h-72 items-center justify-center bg-brand-50 px-6 py-5 sm:h-80">
              <div className="h-full w-auto max-h-full">
                <div className="h-full aspect-[780/1688]">
                  <PhoneFrame
                    src={card.src}
                    alt={card.alt}
                    width={HOME_PHONE_SIZE.width}
                    height={HOME_PHONE_SIZE.height}
                    sizes="200px"
                    className="h-full w-full"
                    fit="fill"
                  />
                </div>
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-bold text-ink-900">{card.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HowImageBox({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-72 items-center justify-center bg-brand-50 p-5 sm:h-80">{children}</div>
  );
}

function HowItWorks({ t, locale }: { t: HomeT; locale: string }) {
  const owner = homeOwnerShot(locale);

  return (
    <section className="mt-14">
      <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
        {t('howTitle')}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
        {t('howSubtitle')}
      </p>
      <ol className="mt-6 grid gap-4 sm:grid-cols-3 sm:grid-rows-[auto_auto]">
        <li className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm sm:row-span-2 sm:grid sm:grid-rows-subgrid">
          <HowImageBox>
            <Image
              src="/images/home/qr-scan.webp"
              alt={t('altQr')}
              width={HOME_QR_SIZE.width}
              height={HOME_QR_SIZE.height}
              sizes="(min-width: 640px) 220px, 70vw"
              className="h-full w-auto max-h-full max-w-full rounded-2xl border border-border bg-paper-50 object-contain shadow-sm"
            />
          </HowImageBox>
          <HowStep index={1} t={t} />
        </li>
        <li className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm sm:row-span-2 sm:grid sm:grid-rows-subgrid">
          <HowImageBox>
            <div className="h-full w-auto max-h-full">
              <div className="h-full aspect-[780/1688]">
                <PhoneFrame
                  src={homeGuestSrc('menu', locale)}
                  alt={t('altMenu')}
                  width={HOME_PHONE_SIZE.width}
                  height={HOME_PHONE_SIZE.height}
                  sizes="200px"
                  className="h-full w-full"
                  fit="fill"
                />
              </div>
            </div>
          </HowImageBox>
          <HowStep index={2} t={t} />
        </li>
        <li className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm sm:row-span-2 sm:grid sm:grid-rows-subgrid">
          <HowImageBox>
            <div className="h-full w-auto max-h-full">
              <div className="h-full aspect-[780/1688]">
                <PhoneFrame
                  src={owner.src}
                  alt={t('altOrders')}
                  width={owner.width}
                  height={owner.height}
                  sizes="200px"
                  className="h-full w-full"
                  fit="fill"
                />
              </div>
            </div>
          </HowImageBox>
          <HowStep index={3} t={t} />
        </li>
      </ol>
    </section>
  );
}

function HowStep({ index, t }: { index: 1 | 2 | 3; t: HomeT }) {
  return (
    <div className="flex h-full gap-4 p-5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-base font-extrabold text-white">
        {index}
      </span>
      <div className="min-w-0">
        <h3 className="font-bold text-ink-900">{t(`howStep${index}Title`)}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {t(`howStep${index}Body`)}
        </p>
      </div>
    </div>
  );
}

function PainSection({ t }: { t: HomeT }) {
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

function HighlightCard({ icon, t, index }: { icon: ReactNode; t: HomeT; index: number }) {
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
      prefetch={false}
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

function BeyondCard({ icon, t, index }: { icon: ReactNode; t: HomeT; index: number }) {
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
