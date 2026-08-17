import { ArrowRightIcon, CheckCircleIcon } from '@phosphor-icons/react/dist/ssr';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { JsonLd } from '@/components/json-ld';
import { LightboxImage } from '@/components/lightbox-image';
import { Link } from '@/i18n/routing';
import { getLandingContent } from '@/lib/content-sources';
import { LANDING_HERO, LANDING_RELATED, LANDING_UPDATED_AT, type LandingSlug } from '@/lib/landing';
import { absoluteWebsiteUrl } from '@/lib/seo';
import { getAppSignupUrl } from '@/lib/site';

type LandingPageProps = {
  slug: LandingSlug;
  params: Promise<{ locale: string }>;
};

type FaqItem = {
  q: string;
  a: string;
};

export async function LandingPage({ slug, params }: LandingPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'landing' });
  const tSlug = await getTranslations({ locale, namespace: `landing.${slug}` });
  const ArticleContent = await getLandingContent(slug, locale);
  if (!ArticleContent) {
    notFound();
  }
  const faq = tSlug.raw('faq') as FaqItem[];
  const related = LANDING_RELATED[slug];
  const hero = LANDING_HERO[slug];
  const title = tSlug('title');
  const description = tSlug('description');
  const answer = tSlug('answer');

  return (
    <article className="mx-auto max-w-3xl py-8 sm:py-12">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'TaoMenu',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          url: absoluteWebsiteUrl(`/${locale}/${slug}`),
          description,
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: t('homeLabel'),
              item: absoluteWebsiteUrl(`/${locale}`),
            },
            { '@type': 'ListItem', position: 2, name: title },
          ],
        }}
      />
      {faq.length > 0 ? (
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
      ) : null}

      <nav aria-label={t('breadcrumbLabel')} className="text-sm text-muted-foreground">
        <Link href="/" className="font-semibold hover:text-brand-700">
          {t('homeLabel')}
        </Link>
        <span aria-hidden> / </span>
        <span>{title}</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">{title}</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
          {description}
        </p>
        <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-5">
          <p className="text-base font-semibold leading-relaxed text-ink-900">{answer}</p>
        </div>
        {hero ? (
          <div className="mt-8">
            <LightboxImage
              src={hero.src}
              alt={hero.alt}
              width={hero.width}
              height={hero.height}
              priority
              className="h-auto w-full rounded-2xl border border-border object-cover"
              sizes="(min-width: 768px) 768px, 100vw"
            />
          </div>
        ) : null}
      </header>

      <div className="doc-prose mt-8">
        <ArticleContent />
      </div>

      {faq.length > 0 ? <FaqSection faq={faq} title={t('faqTitle')} /> : null}

      <RelatedSection
        related={related}
        title={t('relatedTitle')}
        relatedTitles={
          Object.fromEntries(related.map((item) => [item, t(`${item}.title`)])) as Record<
            LandingSlug,
            string
          >
        }
      />

      <CtaSection
        title={t('ctaTitle')}
        body={t('ctaBody')}
        primary={t('ctaPrimary')}
        secondary={t('ctaSecondary')}
      />

      <p className="mt-10 text-xs text-muted-foreground">
        {t('updatedAt', { date: LANDING_UPDATED_AT })}
      </p>
    </article>
  );
}

function FaqSection({ faq, title }: { faq: FaqItem[]; title: string }) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-extrabold text-ink-900">{title}</h2>
      <ul className="mt-6 space-y-4">
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

function RelatedSection({
  related,
  title,
  relatedTitles,
}: {
  related: LandingSlug[];
  title: string;
  relatedTitles: Record<LandingSlug, string>;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-extrabold text-ink-900">{title}</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {related.map((slug) => (
          <li key={slug}>
            <Link
              href={`/${slug}`}
              className="flex h-full items-center justify-between gap-2 rounded-xl border border-border bg-white p-4 text-sm font-bold text-ink-900 hover:bg-brand-50"
            >
              <span>{relatedTitles[slug]}</span>
              <ArrowRightIcon className="size-4 shrink-0 text-brand-600" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CtaSection({
  title,
  body,
  primary,
  secondary,
}: {
  title: string;
  body: string;
  primary: string;
  secondary: string;
}) {
  return (
    <section className="mt-12 rounded-2xl border border-border bg-white p-6 text-center sm:p-8">
      <CheckCircleIcon className="mx-auto size-10 text-jade-600" weight="fill" aria-hidden />
      <h2 className="mt-3 text-2xl font-extrabold text-ink-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{body}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <a
          href={getAppSignupUrl()}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-base font-bold text-white hover:bg-brand-700"
        >
          {primary}
        </a>
        <Link
          href="/pricing"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-white px-5 py-3 text-base font-bold text-ink-900 hover:bg-brand-50"
        >
          {secondary}
        </Link>
      </div>
    </section>
  );
}
