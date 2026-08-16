import { DEFAULT_LOCALE, LOCALES } from '@taomenu/shared';
import { getPublicWebsiteUrl } from '@/lib/site';

/** 拼接站点绝对 URL，path 以 / 开头（空串表示首页） */
export function absoluteWebsiteUrl(path = ''): string {
  return `${getPublicWebsiteUrl()}${path}`;
}

/**
 * 生成 canonical + hreflang 标签所需的 alternates。
 * path 为站内路径（如 ''、'/pricing'、'/phan-mem-order-nha-hang'），
 * x-default 指向默认语言，与 middleware 的 locale 协商一致。
 */
export function buildAlternates(locale: string, path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return {
    canonical: absoluteWebsiteUrl(`/${locale}${normalized}`),
    languages: {
      ...Object.fromEntries(
        LOCALES.map((code) => [code, absoluteWebsiteUrl(`/${code}${normalized}`)]),
      ),
      'x-default': absoluteWebsiteUrl(`/${DEFAULT_LOCALE}${normalized}`),
    },
  };
}
