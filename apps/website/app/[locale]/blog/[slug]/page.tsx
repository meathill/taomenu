import type { Locale } from '@taomenu/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BlogMarkdownBody } from '@/components/blog-markdown';
import { Link } from '@/i18n/routing';
import { getPostWithFallback } from '@/lib/cms-blog';
import { formatDate } from '@/lib/format-date';
import { buildPageMetadata } from '@/lib/seo';

// 博客详情页 ISR：1 天缓存兜底；无静态参数列表，路径按需生成并缓存。
export const revalidate = 86400;

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const result = await getPostWithFallback(slug, locale as Locale);
  if (!result.post) {
    return {};
  }
  return buildPageMetadata(locale, `/blog/${slug}`, result.post.title, result.post.summary);
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

  return (
    <article className="mx-auto max-w-3xl py-8 sm:py-12">
      <header className="mb-8 border-b border-border pb-6">
        <Link href="/blog" className="text-sm font-semibold text-brand-700 hover:underline">
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
