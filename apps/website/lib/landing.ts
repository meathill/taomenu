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
 * 每页顶部 hero 场景图（AI 生成，1248×832 WebP）。
 * 图片放 `public/images/landing/{slug}/hero.webp`，接入时在此登记；暂无图则为 null（不渲染）。
 */
const HERO_SIZE = { width: 1248, height: 832 } as const;

export const LANDING_HERO: Record<LandingSlug, LandingHero | null> = {
  'phan-mem-order-nha-hang': {
    src: '/images/landing/phan-mem-order-nha-hang/hero.webp',
    alt: 'Diners scan a table QR code beside a steaming bowl of phở in a busy Vietnamese restaurant',
    ...HERO_SIZE,
  },
  'menu-qr-cho-quan-an': {
    src: '/images/landing/menu-qr-cho-quan-an/hero.webp',
    alt: 'A hand holds a phone over a printed QR code taped to a restaurant table',
    ...HERO_SIZE,
  },
  'phan-mem-quan-ly-nha-hang-mien-phi': {
    src: '/images/landing/phan-mem-quan-ly-nha-hang-mien-phi/hero.webp',
    alt: 'A small restaurant owner checks orders on one smartphone at a simple wooden counter',
    ...HERO_SIZE,
  },
  'phan-mem-order-tren-dien-thoai': {
    src: '/images/landing/phan-mem-order-tren-dien-thoai/hero.webp',
    alt: 'A street stall owner holds up a phone beside steaming pots on an evening sidewalk',
    ...HERO_SIZE,
  },
  'menu-da-ngon-ngu': {
    src: '/images/landing/menu-da-ngon-ngu/hero.webp',
    alt: 'A cafe owner hands a phone to a tourist couple in a plant-filled Vietnamese cafe',
    ...HERO_SIZE,
  },
  'goi-nhan-vien-bang-ma-qr': {
    src: '/images/landing/goi-nhan-vien-bang-ma-qr/hero.webp',
    alt: 'A waiter walks toward a diner looking at a phone in a packed family restaurant',
    ...HERO_SIZE,
  },
  'phan-mem-order-quan-banh-mi': {
    src: '/images/landing/phan-mem-order-quan-banh-mi/hero.webp',
    alt: 'Customers wait with phones at a Saigon street bánh mì stall while sandwiches are grilled',
    ...HERO_SIZE,
  },
  'phan-mem-order-tiem-banh': {
    src: '/images/landing/phan-mem-order-tiem-banh/hero.webp',
    alt: 'A morning queue inside a Vietnamese bakery lined with baguettes and cakes',
    ...HERO_SIZE,
  },
  'phan-mem-order-quan-cafe-takeaway': {
    src: '/images/landing/phan-mem-order-quan-cafe-takeaway/hero.webp',
    alt: 'A barista pours iced milk coffee for customers waiting at a takeaway counter',
    ...HERO_SIZE,
  },
  'phan-mem-order-quan-an-sang': {
    src: '/images/landing/phan-mem-order-quan-an-sang/hero.webp',
    alt: 'Regulars eat at low plastic tables beside a steaming soup pot at a dawn breakfast stall',
    ...HERO_SIZE,
  },
  'phan-mem-order-quan-do-an-nhanh': {
    src: '/images/landing/phan-mem-order-quan-do-an-nhanh/hero.webp',
    alt: 'A cook hands a takeaway box to customers waiting with phones at a fast-food counter',
    ...HERO_SIZE,
  },
  'phan-mem-order-quan-che': {
    src: '/images/landing/phan-mem-order-quan-che/hero.webp',
    alt: 'Two friends choose colorful bowls of chè at an evening sidewalk dessert stall',
    ...HERO_SIZE,
  },
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
