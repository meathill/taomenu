import { DEFAULT_LOCALE, LOCALES, type Locale } from '@taomenu/shared';

/**
 * 博客跨语言 slug 映射。
 * key = 历史越南语 slug（稳定的翻译组 ID，CMS 未同步前 ja 仍可能存此值）。
 * ja 使用罗马字本地化 slug；其余语言暂保持越南语 slug（issue #12 仅要求日文页）。
 */
export const BLOG_POST_SLUGS = {
  'order-bang-qr-thanh-toan-tai-quay': {
    vi: 'order-bang-qr-thanh-toan-tai-quay',
    en: 'order-bang-qr-thanh-toan-tai-quay',
    zh: 'order-bang-qr-thanh-toan-tai-quay',
    ja: 'qr-chumon-reji-kaikei',
  },
  'menu-dien-tu-la-gi': {
    vi: 'menu-dien-tu-la-gi',
    en: 'menu-dien-tu-la-gi',
    zh: 'menu-dien-tu-la-gi',
    ja: 'dejitaru-menyuu-toha',
  },
  'cach-tao-menu-qr-cho-nha-hang': {
    vi: 'cach-tao-menu-qr-cho-nha-hang',
    en: 'cach-tao-menu-qr-cho-nha-hang',
    zh: 'cach-tao-menu-qr-cho-nha-hang',
    ja: 'qr-menyuu-muryou-sakusei',
  },
  'qr-order-co-can-may-pos-khong': {
    vi: 'qr-order-co-can-may-pos-khong',
    en: 'qr-order-co-can-may-pos-khong',
    zh: 'qr-order-co-can-may-pos-khong',
    ja: 'qr-chumon-pos-hitsuyo',
  },
  'order-qr-co-can-thanh-toan-online-khong': {
    vi: 'order-qr-co-can-thanh-toan-online-khong',
    en: 'order-qr-co-can-thanh-toan-online-khong',
    zh: 'order-qr-co-can-thanh-toan-online-khong',
    ja: 'qr-chumon-online-kessai',
  },
  'menu-da-ngon-ngu-cho-khach-du-lich': {
    vi: 'menu-da-ngon-ngu-cho-khach-du-lich',
    en: 'menu-da-ngon-ngu-cho-khach-du-lich',
    zh: 'menu-da-ngon-ngu-cho-khach-du-lich',
    ja: 'tagengo-qr-menyuu',
  },
  'quan-an-nho-co-can-may-pos-khong': {
    vi: 'quan-an-nho-co-can-may-pos-khong',
    en: 'quan-an-nho-co-can-may-pos-khong',
    zh: 'quan-an-nho-co-can-may-pos-khong',
    ja: 'kogata-inshokuten-pos',
  },
  'phan-biet-menu-qr-va-qr-order': {
    vi: 'phan-biet-menu-qr-va-qr-order',
    en: 'phan-biet-menu-qr-va-qr-order',
    zh: 'phan-biet-menu-qr-va-qr-order',
    ja: 'qr-menyuu-to-qr-order',
  },
} as const satisfies Record<string, Record<Locale, string>>;

export type BlogContentKey = keyof typeof BLOG_POST_SLUGS;

/** 旧越南语 slug → 日文罗马字 slug（用于 /ja/blog/… 301） */
export const JA_BLOG_SLUG_REDIRECTS: Readonly<Record<string, string>> = Object.fromEntries(
  (Object.keys(BLOG_POST_SLUGS) as BlogContentKey[]).map((key) => [key, BLOG_POST_SLUGS[key].ja]),
);

/** 日文新 slug → 历史越南语 slug（CMS 未 sync 前仍可能按旧 slug 存稿） */
export const JA_BLOG_SLUG_TO_LEGACY: Readonly<Record<string, string>> = Object.fromEntries(
  (Object.keys(BLOG_POST_SLUGS) as BlogContentKey[]).map((key) => [BLOG_POST_SLUGS[key].ja, key]),
);

export function getBlogSlugForLocale(contentKey: string, locale: string): string {
  const entry = BLOG_POST_SLUGS[contentKey as BlogContentKey];
  if (!entry) {
    return contentKey;
  }
  return entry[locale as Locale] ?? entry[DEFAULT_LOCALE] ?? contentKey;
}

/** 任意语言下的公开 slug → 稳定 content key；未知文章返回 null */
export function resolveBlogContentKey(slug: string): string | null {
  if (slug in BLOG_POST_SLUGS) {
    return slug;
  }
  for (const key of Object.keys(BLOG_POST_SLUGS) as BlogContentKey[]) {
    const entry = BLOG_POST_SLUGS[key];
    for (const locale of LOCALES) {
      if (entry[locale] === slug) {
        return key;
      }
    }
  }
  return null;
}

/** 将 CMS/遗留 slug 规范为当前 locale 应对外暴露的 URL slug */
export function toPublicBlogSlug(slug: string, locale: string): string {
  const key = resolveBlogContentKey(slug) ?? slug;
  return getBlogSlugForLocale(key, locale);
}

/** CMS 查询用 slug：日文新 URL 在 CMS 未更新时回退查旧越南语 slug */
export function toCmsLookupSlugs(slug: string, locale: string): string[] {
  if (locale !== 'ja') {
    return [slug];
  }
  const legacy = JA_BLOG_SLUG_TO_LEGACY[slug];
  if (legacy && legacy !== slug) {
    return [slug, legacy];
  }
  // 若传入的已是旧 slug，也尝试对应新 slug（sync 之后）
  const localized = JA_BLOG_SLUG_REDIRECTS[slug];
  if (localized && localized !== slug) {
    return [slug, localized];
  }
  return [slug];
}
