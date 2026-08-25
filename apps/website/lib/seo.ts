import { DEFAULT_LOCALE, LOCALES } from '@taomenu/shared';
import { getPublicWebsiteUrl } from '@/lib/site';

/** 拼接站点绝对 URL，path 以 / 开头（空串表示首页） */
export function absoluteWebsiteUrl(path = ''): string {
  return `${getPublicWebsiteUrl()}${path}`;
}

function normalizeSeoPath(path: string): string {
  if (!path || path === '/') {
    return '';
  }
  const withLeading = path.startsWith('/') ? path : `/${path}`;
  if (withLeading.length > 1 && withLeading.endsWith('/')) {
    return withLeading.slice(0, -1);
  }
  return withLeading;
}

function toLocalizedPath(locale: string, normalized: string): string {
  if (locale === DEFAULT_LOCALE) {
    return normalized || '';
  }
  return `/${locale}${normalized}`;
}

/**
 * 生成 canonical + hreflang 标签所需的 alternates。
 * path 为站内路径（如 ''、'/pricing'、'/phan-mem-order-nha-hang'），
 * x-default 指向默认语言，与 middleware 的 locale 协商一致。
 * 约定：默认语言 en 裸路径（/pricing），其余语言带前缀（/ja/pricing），全量无尾斜杠（根 / 除外）。
 */
export function buildAlternates(locale: string, path: string) {
  const normalized = normalizeSeoPath(path);
  const canonical = absoluteWebsiteUrl(toLocalizedPath(locale, normalized));
  const languages: Record<string, string> = {};
  for (const code of LOCALES) {
    languages[code] = absoluteWebsiteUrl(toLocalizedPath(code, normalized));
  }
  languages['x-default'] = absoluteWebsiteUrl(toLocalizedPath(DEFAULT_LOCALE, normalized));
  return {
    canonical,
    languages,
  };
}

/**
 * 页面级 metadata 统一构造：title / description / canonical+hreflang / OG。
 * openGraph 只覆盖本页字段，images 等其余字段由 layout 默认值合并保留。
 */
export function buildPageMetadata(
  locale: string,
  path: string,
  title: string,
  description: string,
) {
  return {
    title,
    description,
    alternates: buildAlternates(locale, path),
    openGraph: {
      title,
      description,
      url: absoluteWebsiteUrl(toLocalizedPath(locale, normalizeSeoPath(path))),
      images: [
        {
          url: absoluteWebsiteUrl('/brand/og-default.png'),
          width: 1200,
          height: 630,
          alt: 'TaoMenu',
        },
      ],
    },
    twitter: {
      title,
      description,
      images: [absoluteWebsiteUrl('/brand/og-default.png')],
    },
  };
}
