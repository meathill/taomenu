import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { listPublishedPosts } from '@/lib/cms-blog';
import { formatDate } from '@/lib/format-date';
import { buildPageMetadata } from '@/lib/seo';

// 博客页 ISR：1 天缓存兜底；CMS 后台发文后最长 1 天生效。
export const revalidate = 86400;

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'blog' });
  return buildPageMetadata(locale, '/blog', t('title'), t('description'));
}

export default async function BlogIndexPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'blog' });
  const posts = await listPublishedPosts(locale as never);

  return (
    <article className="mx-auto max-w-3xl py-8 sm:py-12">
      <header className="mb-8">
        <p className="text-sm font-semibold text-brand-700">{t('label')}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          {t('description')}
        </h1>
      </header>

      {posts.length === 0 ? (
        <p className="rounded-2xl border border-border bg-white/60 px-6 py-10 text-center text-sm text-muted-foreground">
          {t('empty')}
        </p>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group grid gap-2 rounded-2xl border border-border bg-white/60 p-5 transition-[border-color,box-shadow] hover:border-brand-600/40 hover:shadow-sm"
            >
              <h2 className="text-xl font-bold tracking-tight text-ink-900 group-hover:text-brand-700">
                {post.title}
              </h2>
              <p className="text-xs tabular-nums text-muted-foreground">
                {formatDate(post.publishedAt)}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">{post.summary}</p>
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
