import { LOCALES } from '@taomenu/shared';
import type { MetadataRoute } from 'next';
import { WEBSITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['', '/pricing'];

  return LOCALES.flatMap((locale) =>
    paths.map((path) => ({
      url: `${WEBSITE_URL}/${locale}${path}`,
      lastModified: new Date(),
      alternates: {
        languages: Object.fromEntries(LOCALES.map((alt) => [alt, `${WEBSITE_URL}/${alt}${path}`])),
      },
    })),
  );
}
