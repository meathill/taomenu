import { APP_NAME, DEFAULT_LOCALE, LOCALES, type Locale } from '@taomenu/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BlogMarkdownBody } from '@/components/blog-markdown';
import { JsonLd } from '@/components/json-ld';
import { Link } from '@/i18n/routing';
import { getPostWithFallback, listPublishedPosts } from '@/lib/cms-blog';
import { formatDate } from '@/lib/format-date';
import { absoluteWebsiteUrl, buildBlogPageMetadata } from '@/lib/seo';
import { getPublicWebsiteUrl } from '@/lib/site';

// 与落地页一致：纯 SSG + OpenNext staticAssetsIncrementalCache → s-maxage 长缓存。
// 不再用 ISR revalidate（staticAssets 只读，ISR 会落到 private/no-store）。
export const dynamic = 'force-static';

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  const params: { locale: string; slug: string }[] = [];
  for (const locale of LOCALES) {
    const posts = await listPublishedPosts(locale);
    for (const post of posts) {
      params.push({ locale, slug: post.slug });
    }
  }
  return params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const result = await getPostWithFallback(slug, locale as Locale);
  if (!result.post) {
    return {};
  }
  return buildBlogPageMetadata(locale, slug, result.post.title, result.post.summary);
}

export default async function BlogPostPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'blog' });
  const result = await getPostWithFallback(slug, locale as Locale);
  if (!result.post) {
    notFound();
  }
  const post = result.post;
  const websiteUrl = getPublicWebsiteUrl();

  return (
    <article className="mx-auto max-w-3xl py-8 sm:py-12">
      {/* 文章级 BlogPosting；站点级 Organization/WebSite 仍在 layout（issue #12） */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.summary,
          image: absoluteWebsiteUrl('/brand/og-default.png'),
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          inLanguage: locale,
          mainEntityOfPage: absoluteWebsiteUrl(
            locale === DEFAULT_LOCALE ? `/blog/${post.slug}` : `/${locale}/blog/${post.slug}`,
          ),
          author: {
            '@type': 'Organization',
            name: APP_NAME,
            url: websiteUrl,
          },
          publisher: {
            '@type': 'Organization',
            name: APP_NAME,
            url: websiteUrl,
            logo: {
              '@type': 'ImageObject',
              url: absoluteWebsiteUrl('/brand/taomenu-mark.svg'),
            },
          },
        }}
      />

      <header className="mb-8 border-b border-border pb-6">
        <Link
          href="/blog"
          prefetch={false}
          className="text-sm font-semibold text-brand-700 hover:underline"
        >
          ← {t('backToBlog')}
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 text-xs tabular-nums text-muted-foreground">
          {formatDate(post.publishedAt)}
          {result.isFallback ? ` · ${t('englishFallback')}` : ''}
        </p>
      </header>

      <BlogMarkdownBody markdown={post.bodyMarkdown} />
    </article>
  );
}
