import { LOCALES } from '@taomenu/shared';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { DocLanguageAlert } from '@/components/doc-language-alert';
import { mdxComponents } from '@/components/mdx-components';
import { type DocSlug, loadDocSource } from '@/lib/docs';
import { buildAlternates } from '@/lib/seo';

type DocPageProps = {
  slug: DocSlug;
  params: Promise<{ locale: string }>;
};

export async function DocPage({ slug, params }: DocPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'docs' });
  const { source } = await loadDocSource(slug, locale);
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
        <MDXRemote source={source} components={mdxComponents} />
      </div>
    </article>
  );
}

export function docStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function docMetadata(slug: DocSlug, locale: string) {
  const t = await getTranslations({ locale, namespace: 'docs' });
  return {
    title: t(`${slug}.title`),
    description: t(`${slug}.description`),
    alternates: buildAlternates(locale, `/${slug}`),
  };
}
