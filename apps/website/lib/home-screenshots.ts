/**
 * Locale-aware marketing screenshots.
 *
 * Guest menu / detail / cart: only locales the QA store has actually published
 * (Free plan = base + one more → vi and en). Other page locales fall back to en.
 * Owner inbox and menu editor: mobile-width captures in en, vi, zh, and ja
 * (owner chrome matches the page locale). Unknown locales fall back to the English owner shot.
 */

export const HOME_PHONE_SIZE = { width: 780, height: 1688 } as const;
export const HOME_OWNER_PHONE_SIZE = { width: 390, height: 844 } as const;
export const HOME_QR_SIZE = { width: 900, height: 1100 } as const;

export const GUEST_SHOT_LOCALES = ['en', 'vi'] as const;
export type GuestShotLocale = (typeof GUEST_SHOT_LOCALES)[number];
export type GuestShotKind = 'menu' | 'detail' | 'cart';

/** Locales with a real mobile-width owner inbox shot. */
export const OWNER_PHONE_LOCALES = ['en', 'vi', 'zh', 'ja'] as const;
export type OwnerShotLocale = (typeof OWNER_PHONE_LOCALES)[number];

const OWNER_PHONE_LOCALE_SET = new Set<string>(OWNER_PHONE_LOCALES);

export function guestShotLocale(pageLocale: string): GuestShotLocale {
  return pageLocale === 'vi' ? 'vi' : 'en';
}

export function homeGuestSrc(kind: GuestShotKind, pageLocale: string): string {
  return `/images/home/${kind}-${guestShotLocale(pageLocale)}.webp`;
}

export function ownerShotLocale(pageLocale: string): OwnerShotLocale {
  return OWNER_PHONE_LOCALE_SET.has(pageLocale) ? (pageLocale as OwnerShotLocale) : 'en';
}

export type OwnerShot = {
  src: string;
  width: number;
  height: number;
};

export type OwnerShotKind = 'orders' | 'menu';

export function homeOwnerShot(pageLocale: string, kind: OwnerShotKind = 'orders'): OwnerShot {
  const locale = ownerShotLocale(pageLocale);
  return {
    src: `/images/home/owner-${kind}-${locale}.webp`,
    width: HOME_OWNER_PHONE_SIZE.width,
    height: HOME_OWNER_PHONE_SIZE.height,
  };
}

export const HOME_HERO_SLIDE_IDS = ['menu', 'detail', 'cart', 'orders', 'editor'] as const;
export type HomeHeroSlideId = (typeof HOME_HERO_SLIDE_IDS)[number];

export type HomeHeroSlide = {
  id: HomeHeroSlideId;
  src: string;
  width: number;
  height: number;
};

/** Hero gallery slides in story order. Guest shots follow published menu languages. */
export function homeHeroSlides(pageLocale: string): HomeHeroSlide[] {
  const menu: HomeHeroSlide = {
    id: 'menu',
    src: homeGuestSrc('menu', pageLocale),
    width: HOME_PHONE_SIZE.width,
    height: HOME_PHONE_SIZE.height,
  };
  const detail: HomeHeroSlide = {
    id: 'detail',
    src: homeGuestSrc('detail', pageLocale),
    width: HOME_PHONE_SIZE.width,
    height: HOME_PHONE_SIZE.height,
  };
  const cart: HomeHeroSlide = {
    id: 'cart',
    src: homeGuestSrc('cart', pageLocale),
    width: HOME_PHONE_SIZE.width,
    height: HOME_PHONE_SIZE.height,
  };
  const ordersShot = homeOwnerShot(pageLocale, 'orders');
  const orders: HomeHeroSlide = {
    id: 'orders',
    src: ordersShot.src,
    width: ordersShot.width,
    height: ordersShot.height,
  };
  const editorShot = homeOwnerShot(pageLocale, 'menu');
  const editor: HomeHeroSlide = {
    id: 'editor',
    src: editorShot.src,
    width: editorShot.width,
    height: editorShot.height,
  };
  return [menu, detail, cart, orders, editor];
}
