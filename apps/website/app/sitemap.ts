import { LOCALES } from '@taomenu/shared';
import type { MetadataRoute } from 'next';
import { getPublicWebsiteUrl } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['', '/pricing'];
  const websiteUrl = getPublicWebsiteUrl();

  return LOCALES.flatMap((locale) =>
    paths.map((path) => ({
      url: `${websiteUrl}/${locale}${path}`,
      lastModified: new Date(),
      alternates: {
        languages: Object.fromEntries(LOCALES.map((alt) => [alt, `${websiteUrl}/${alt}${path}`])),
      },
    })),
  );
}
