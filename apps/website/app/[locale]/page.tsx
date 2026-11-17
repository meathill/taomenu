import { MapPinIcon, ShareNetworkIcon, StarIcon } from '@phosphor-icons/react/dist/ssr';
import { BILLING_PROMOS, formatPromoEndDate, isProPlusEarlyBirdActive } from '@taomenu/shared';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { HeroGallery } from '@/components/hero-gallery';
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

type HomeT = Awaited<ReturnType<typeof getTranslations>>;

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  const earlyBirdActive = isProPlusEarlyBirdActive();
  const earlyBirdDate = earlyBirdActive
    ? formatPromoEndDate(BILLING_PROMOS.proPlusEarlyBird.endDate, locale)
    : null;

  return (
    <div className="pt-6 pb-16 sm:pt-12 sm:pb-20">
      <HeroSection t={t} locale={locale} />

      <HowItWorks t={t} locale={locale} />

      <GrowthSection t={t} earlyBirdDate={earlyBirdDate} />

      <section className="mt-14 rounded-2xl border border-border bg-white p-6 text-center sm:p-10">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          {t('finalCtaTitle')}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t('finalCtaBody')}
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
          <a
            href={getAppSignupUrl()}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-600 px-6 py-3 text-base font-bold text-white hover:bg-brand-700 sm:w-auto"
          >
            {t('finalCtaPrimary')}
          </a>
          <Link
            href="/pricing"
            prefetch={false}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-border bg-white px-6 py-3 text-base font-bold text-ink-900 hover:bg-brand-50 sm:w-auto"
          >
            {t('finalCtaSecondary')}
          </Link>
        </div>
      </section>
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

function GrowthSection({ t, earlyBirdDate }: { t: HomeT; earlyBirdDate: string | null }) {
  const channels = [
    { icon: <MapPinIcon className="size-6" aria-hidden />, key: 'Maps' as const },
    { icon: <StarIcon className="size-6" aria-hidden />, key: 'Reviews' as const },
    { icon: <ShareNetworkIcon className="size-6" aria-hidden />, key: 'Social' as const },
  ];

  return (
    <section className="mt-14 rounded-2xl bg-brand-50 p-6 sm:p-8">
      <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
        {t('growthTitle')}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {t('growthSubtitle')}
      </p>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-900 sm:text-base">
        {t('growthBody')}
      </p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {channels.map((channel) => (
          <li key={channel.key} className="min-w-0 rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex size-11 items-center justify-center rounded-xl bg-jade-600 text-white">
              {channel.icon}
            </div>
            <h3 className="mt-3 font-bold text-ink-900">{t(`growth${channel.key}Title`)}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {t(`growth${channel.key}Body`)}
            </p>
          </li>
        ))}
      </ul>
      {earlyBirdDate ? (
        <p className="mt-6 text-sm font-medium text-jade-800">
          {t('growthEarlyBird', { date: earlyBirdDate })}
        </p>
      ) : null}
      <Link
        href="/pricing"
        prefetch={false}
        className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-600 px-6 py-3 text-base font-bold text-white hover:bg-brand-700"
      >
        {t('growthCta')}
      </Link>
    </section>
  );
}
