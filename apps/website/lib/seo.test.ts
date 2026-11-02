import { DEFAULT_LOCALE, LOCALES } from '@taomenu/shared';
import { describe, expect, it } from 'vitest';
import { BLOG_POST_SLUGS, type BlogContentKey, getBlogSlugForLocale } from './blog-slugs';
import { absoluteWebsiteUrl, buildBlogAlternates, buildBlogPageMetadata } from './seo';

const baseUrl = absoluteWebsiteUrl('');

function expectedUrl(locale: string, contentKey: string): string {
  const slug = getBlogSlugForLocale(contentKey, locale);
  const path = locale === DEFAULT_LOCALE ? `/blog/${slug}` : `/${locale}/blog/${slug}`;
  return `${baseUrl}${path}`;
}

describe('buildBlogAlternates', () => {
  const contentKeys = Object.keys(BLOG_POST_SLUGS) as BlogContentKey[];

  for (const contentKey of contentKeys) {
    for (const locale of LOCALES) {
      it(`${contentKey} @ ${locale}`, () => {
        const { canonical, languages } = buildBlogAlternates(locale, contentKey);

        expect(canonical).toBe(expectedUrl(locale, contentKey));
        expect(languages['x-default']).toBe(expectedUrl(DEFAULT_LOCALE, contentKey));

        for (const code of LOCALES) {
          expect(languages[code]).toBe(expectedUrl(code, contentKey));
        }

        const localizedUrls = LOCALES.map((code) => languages[code]);
        expect(new Set(localizedUrls).size).toBe(LOCALES.length);
      });
    }
  }

  it('错误的请求 slug 仍生成当前语言 canonical', () => {
    const metadata = buildBlogPageMetadata('zh', 'tagengo-qr-menyuu', '标题', '摘要');

    expect(metadata.alternates.canonical).toBe(
      expectedUrl('zh', 'menu-da-ngon-ngu-cho-khach-du-lich'),
    );
    expect(metadata.openGraph.url).toBe(expectedUrl('zh', 'menu-da-ngon-ngu-cho-khach-du-lich'));
  });
});
