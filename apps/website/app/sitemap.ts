import { LOCALES } from '@taomenu/shared';
import type { MetadataRoute } from 'next';
import { listPublishedPosts } from '@/lib/cms-blog';
import { DOC_SLUGS } from '@/lib/docs';
import { LANDING_SLUGS } from '@/lib/landing';
import { getPublicWebsiteUrl } from '@/lib/site';

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = [
    '',
    '/pricing',
    '/blog',
    ...DOC_SLUGS.map((slug) => `/${slug}`),
    ...LANDING_SLUGS.map((slug) => `/${slug}`),
  ];
  const websiteUrl = getPublicWebsiteUrl();

  // 博客文章按 locale 各自拉取；CMS 不可达时 listPublishedPosts 返回空数组，不阻断 sitemap。
  const postsByLocale = new Map(
    await Promise.all(LOCALES.map(async (locale) => [locale, await listPublishedPosts(locale)] as const)),
  );

  return [
    ...LOCALES.flatMap((locale) =>
      paths.map((path) => ({
        url: `${websiteUrl}/${locale}${path}`,
        lastModified: new Date(),
        alternates: {
          languages: Object.fromEntries(LOCALES.map((alt) => [alt, `${websiteUrl}/${alt}${path}`])),
        },
      })),
    ),
    ...LOCALES.flatMap((locale) =>
      (postsByLocale.get(locale) ?? []).map((post) => ({
        url: `${websiteUrl}/${locale}/blog/${post.slug}`,
        lastModified: new Date(post.updatedAt),
      })),
    ),
  ];
}
