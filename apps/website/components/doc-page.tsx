import { LOCALES } from '@taomenu/shared';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DocLanguageAlert } from '@/components/doc-language-alert';
import { getDocContent } from '@/lib/content-sources';
import type { DocSlug } from '@/lib/docs';
import { buildPageMetadata } from '@/lib/seo';

type DocPageProps = {
  slug: DocSlug;
  params: Promise<{ locale: string }>;
};

export async function DocPage({ slug, params }: DocPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'docs' });
  const DocContent = await getDocContent(slug, locale);
  if (!DocContent) {
    notFound();
  }
  const title = t(`${slug}.title`);
  const description = t(`${slug}.description`);

  return (
    <article className="mx-auto max-w-3xl py-8 sm:py-12">
      <header className="mb-2">
        <p className="text-sm font-semibold text-brand-700">{t('label')}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">{description}</p>
      </header>

      <DocLanguageAlert locale={locale} slug={slug} />

      <div className="doc-prose mt-8">
        <DocContent />
      </div>
    </article>
  );
}

export function docStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function docMetadata(slug: DocSlug, locale: string) {
  const t = await getTranslations({ locale, namespace: 'docs' });
  return buildPageMetadata(locale, `/${slug}`, t(`${slug}.title`), t(`${slug}.description`));
}
