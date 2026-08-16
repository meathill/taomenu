import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@taomenu/shared';

/**
 * 高意图落地页 slug（见 docs/KEYWORD_RESEARCH.md 3.2）。
 * URL 直接挂 `/locale/{slug}`，与 docs slug 互斥。
 */
export const LANDING_SLUGS = [
  'phan-mem-order-nha-hang',
  'menu-qr-cho-quan-an',
  'phan-mem-quan-ly-nha-hang-mien-phi',
  'phan-mem-order-tren-dien-thoai',
  'menu-da-ngon-ngu',
  'goi-nhan-vien-bang-ma-qr',
  'phan-mem-order-quan-banh-mi',
] as const;

export type LandingSlug = (typeof LANDING_SLUGS)[number];

export function isLandingSlug(value: string): value is LandingSlug {
  return (LANDING_SLUGS as readonly string[]).includes(value);
}

/** 落地页内容最后更新时间，人工随内容变更，避免构建时动态生成 */
export const LANDING_UPDATED_AT = '2026-08';

/** 每页「相关内容」链接（相互网状内链），label 取各语言 landing.{slug}.title */
export const LANDING_RELATED: Record<LandingSlug, LandingSlug[]> = {
  'phan-mem-order-nha-hang': [
    'menu-qr-cho-quan-an',
    'phan-mem-order-tren-dien-thoai',
    'phan-mem-quan-ly-nha-hang-mien-phi',
  ],
  'menu-qr-cho-quan-an': [
    'phan-mem-order-nha-hang',
    'menu-da-ngon-ngu',
    'phan-mem-order-quan-banh-mi',
  ],
  'phan-mem-quan-ly-nha-hang-mien-phi': [
    'phan-mem-order-nha-hang',
    'phan-mem-order-tren-dien-thoai',
    'menu-qr-cho-quan-an',
  ],
  'phan-mem-order-tren-dien-thoai': [
    'phan-mem-order-nha-hang',
    'menu-qr-cho-quan-an',
    'phan-mem-order-quan-banh-mi',
  ],
  'menu-da-ngon-ngu': [
    'phan-mem-order-nha-hang',
    'menu-qr-cho-quan-an',
    'goi-nhan-vien-bang-ma-qr',
  ],
  'goi-nhan-vien-bang-ma-qr': [
    'phan-mem-order-nha-hang',
    'menu-da-ngon-ngu',
    'menu-qr-cho-quan-an',
  ],
  'phan-mem-order-quan-banh-mi': [
    'phan-mem-order-nha-hang',
    'menu-qr-cho-quan-an',
    'phan-mem-order-tren-dien-thoai',
  ],
};

/**
 * 读取落地页 MDX 正文。构建期 force-static 时用 fs 即可；
 * 若某 locale 缺失则回退英文。
 */
export async function loadLandingSource(
  slug: LandingSlug,
  locale: string,
): Promise<{ source: string; contentLocale: Locale; usedFallback: boolean }> {
  const contentLocale: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const dir = path.join(process.cwd(), 'content', 'landing', slug);

  try {
    const source = await readFile(path.join(dir, `${contentLocale}.mdx`), 'utf8');
    return { source, contentLocale, usedFallback: false };
  } catch {
    const source = await readFile(path.join(dir, `${DEFAULT_LOCALE}.mdx`), 'utf8');
    return { source, contentLocale: DEFAULT_LOCALE, usedFallback: true };
  }
}
