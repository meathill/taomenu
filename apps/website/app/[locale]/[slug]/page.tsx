import { LOCALES } from '@taomenu/shared';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LandingPage } from '@/components/landing-page';
import { isLandingSlug, LANDING_SLUGS } from '@/lib/landing';
import { buildPageMetadata } from '@/lib/seo';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => LANDING_SLUGS.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLandingSlug(slug)) {
    return {};
  }
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: `landing.${slug}` });

  return buildPageMetadata(locale, `/${slug}`, t('title'), t('description'));
}

export default async function LandingRoute({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLandingSlug(slug)) {
    notFound();
  }
  return <LandingPage slug={slug} params={params} />;
}
