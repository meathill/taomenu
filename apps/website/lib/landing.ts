/**
 * 高意图落地页 slug（见 docs/KEYWORD_RESEARCH.md 3.2）。
 * URL 直接挂 `/locale/{slug}`，与 docs slug 互斥。
 * MDX 正文经 lib/content-sources.ts 编译进 bundle。
 */
export const LANDING_SLUGS = [
  'phan-mem-order-nha-hang',
  'menu-qr-cho-quan-an',
  'phan-mem-quan-ly-nha-hang-mien-phi',
  'phan-mem-order-tren-dien-thoai',
  'menu-da-ngon-ngu',
  'goi-nhan-vien-bang-ma-qr',
  'phan-mem-order-quan-banh-mi',
  'phan-mem-order-tiem-banh',
  'phan-mem-order-quan-cafe-takeaway',
  'phan-mem-order-quan-an-sang',
  'phan-mem-order-quan-do-an-nhanh',
  'phan-mem-order-quan-che',
] as const;

export type LandingSlug = (typeof LANDING_SLUGS)[number];

export function isLandingSlug(value: string): value is LandingSlug {
  return (LANDING_SLUGS as readonly string[]).includes(value);
}

export type LandingHero = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/**
 * 每页顶部 hero 场景图（GPT+/Grok 生成）。
 * 图片放 `public/images/landing/{slug}/`，接入时在此登记；暂无图则为 null（不渲染）。
 */
export const LANDING_HERO: Record<LandingSlug, LandingHero | null> = {
  'phan-mem-order-nha-hang': null,
  'menu-qr-cho-quan-an': null,
  'phan-mem-quan-ly-nha-hang-mien-phi': null,
  'phan-mem-order-tren-dien-thoai': null,
  'menu-da-ngon-ngu': null,
  'goi-nhan-vien-bang-ma-qr': null,
  'phan-mem-order-quan-banh-mi': null,
  'phan-mem-order-tiem-banh': null,
  'phan-mem-order-quan-cafe-takeaway': null,
  'phan-mem-order-quan-an-sang': null,
  'phan-mem-order-quan-do-an-nhanh': null,
  'phan-mem-order-quan-che': null,
};

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
    'phan-mem-order-tiem-banh',
    'phan-mem-order-quan-cafe-takeaway',
  ],
  'phan-mem-order-tiem-banh': [
    'phan-mem-order-quan-banh-mi',
    'phan-mem-order-quan-do-an-nhanh',
    'menu-qr-cho-quan-an',
  ],
  'phan-mem-order-quan-cafe-takeaway': [
    'phan-mem-order-quan-an-sang',
    'phan-mem-order-quan-do-an-nhanh',
    'phan-mem-order-nha-hang',
  ],
  'phan-mem-order-quan-an-sang': [
    'phan-mem-order-quan-cafe-takeaway',
    'phan-mem-order-quan-banh-mi',
    'menu-qr-cho-quan-an',
  ],
  'phan-mem-order-quan-do-an-nhanh': [
    'phan-mem-order-tiem-banh',
    'phan-mem-order-quan-cafe-takeaway',
    'phan-mem-order-quan-an-sang',
  ],
  'phan-mem-order-quan-che': [
    'phan-mem-order-quan-cafe-takeaway',
    'phan-mem-order-quan-banh-mi',
    'menu-qr-cho-quan-an',
  ],
};
