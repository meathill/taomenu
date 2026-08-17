import { DEFAULT_LOCALE, isLocale, type Locale } from '@taomenu/shared';
import type { ComponentType } from 'react';
import type { DocSlug } from '@/lib/docs';
import type { LandingSlug } from '@/lib/landing';

/**
 * MDX 正文统一编译进 bundle（@next/mdx），避免运行时 fs 读 content 目录。
 * 每个 slug × locale 一条动态 import；locale 缺失时回退英文。
 * 参考 mui-api 的 blog-content.ts。
 */
type MdxModule = { default: ComponentType };
type ContentLoader = () => Promise<MdxModule>;
type LocaleLoaders = Record<Locale, ContentLoader>;

export const docContentLoaders: Record<DocSlug, LocaleLoaders> = {
  about: {
    en: () => import('@/content/about/en.mdx'),
    zh: () => import('@/content/about/zh.mdx'),
    ja: () => import('@/content/about/ja.mdx'),
    vi: () => import('@/content/about/vi.mdx'),
  },
  'contact-us': {
    en: () => import('@/content/contact-us/en.mdx'),
    zh: () => import('@/content/contact-us/zh.mdx'),
    ja: () => import('@/content/contact-us/ja.mdx'),
    vi: () => import('@/content/contact-us/vi.mdx'),
  },
  privacy: {
    en: () => import('@/content/privacy/en.mdx'),
    zh: () => import('@/content/privacy/zh.mdx'),
    ja: () => import('@/content/privacy/ja.mdx'),
    vi: () => import('@/content/privacy/vi.mdx'),
  },
  terms: {
    en: () => import('@/content/terms/en.mdx'),
    zh: () => import('@/content/terms/zh.mdx'),
    ja: () => import('@/content/terms/ja.mdx'),
    vi: () => import('@/content/terms/vi.mdx'),
  },
};

export const landingContentLoaders: Record<LandingSlug, LocaleLoaders> = {
  'phan-mem-order-nha-hang': {
    en: () => import('@/content/landing/phan-mem-order-nha-hang/en.mdx'),
    zh: () => import('@/content/landing/phan-mem-order-nha-hang/zh.mdx'),
    ja: () => import('@/content/landing/phan-mem-order-nha-hang/ja.mdx'),
    vi: () => import('@/content/landing/phan-mem-order-nha-hang/vi.mdx'),
  },
  'menu-qr-cho-quan-an': {
    en: () => import('@/content/landing/menu-qr-cho-quan-an/en.mdx'),
    zh: () => import('@/content/landing/menu-qr-cho-quan-an/zh.mdx'),
    ja: () => import('@/content/landing/menu-qr-cho-quan-an/ja.mdx'),
    vi: () => import('@/content/landing/menu-qr-cho-quan-an/vi.mdx'),
  },
  'phan-mem-quan-ly-nha-hang-mien-phi': {
    en: () => import('@/content/landing/phan-mem-quan-ly-nha-hang-mien-phi/en.mdx'),
    zh: () => import('@/content/landing/phan-mem-quan-ly-nha-hang-mien-phi/zh.mdx'),
    ja: () => import('@/content/landing/phan-mem-quan-ly-nha-hang-mien-phi/ja.mdx'),
    vi: () => import('@/content/landing/phan-mem-quan-ly-nha-hang-mien-phi/vi.mdx'),
  },
  'phan-mem-order-tren-dien-thoai': {
    en: () => import('@/content/landing/phan-mem-order-tren-dien-thoai/en.mdx'),
    zh: () => import('@/content/landing/phan-mem-order-tren-dien-thoai/zh.mdx'),
    ja: () => import('@/content/landing/phan-mem-order-tren-dien-thoai/ja.mdx'),
    vi: () => import('@/content/landing/phan-mem-order-tren-dien-thoai/vi.mdx'),
  },
  'menu-da-ngon-ngu': {
    en: () => import('@/content/landing/menu-da-ngon-ngu/en.mdx'),
    zh: () => import('@/content/landing/menu-da-ngon-ngu/zh.mdx'),
    ja: () => import('@/content/landing/menu-da-ngon-ngu/ja.mdx'),
    vi: () => import('@/content/landing/menu-da-ngon-ngu/vi.mdx'),
  },
  'goi-nhan-vien-bang-ma-qr': {
    en: () => import('@/content/landing/goi-nhan-vien-bang-ma-qr/en.mdx'),
    zh: () => import('@/content/landing/goi-nhan-vien-bang-ma-qr/zh.mdx'),
    ja: () => import('@/content/landing/goi-nhan-vien-bang-ma-qr/ja.mdx'),
    vi: () => import('@/content/landing/goi-nhan-vien-bang-ma-qr/vi.mdx'),
  },
  'phan-mem-order-quan-banh-mi': {
    en: () => import('@/content/landing/phan-mem-order-quan-banh-mi/en.mdx'),
    zh: () => import('@/content/landing/phan-mem-order-quan-banh-mi/zh.mdx'),
    ja: () => import('@/content/landing/phan-mem-order-quan-banh-mi/ja.mdx'),
    vi: () => import('@/content/landing/phan-mem-order-quan-banh-mi/vi.mdx'),
  },
};

function pickLoader(loaders: LocaleLoaders, locale: string): ContentLoader | null {
  const contentLocale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  return loaders[contentLocale] ?? loaders[DEFAULT_LOCALE] ?? null;
}

export async function getDocContent(slug: DocSlug, locale: string): Promise<ComponentType | null> {
  const loader = pickLoader(docContentLoaders[slug], locale);
  if (!loader) {
    return null;
  }
  const { default: Content } = await loader();
  return Content;
}

export async function getLandingContent(
  slug: LandingSlug,
  locale: string,
): Promise<ComponentType | null> {
  const loader = pickLoader(landingContentLoaders[slug], locale);
  if (!loader) {
    return null;
  }
  const { default: Content } = await loader();
  return Content;
}
