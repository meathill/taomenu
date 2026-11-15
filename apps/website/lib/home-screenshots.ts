/**
 * Locale-aware marketing screenshots.
 *
 * Guest menu / detail / cart: only locales the QA store has actually published
 * (Free plan = base + one more → vi and en). Other page locales fall back to en.
 * Owner inbox: mobile-width captures per UI locale when present; otherwise a
 * temporary shared fallback (do not invent translations).
 */

export const HOME_PHONE_SIZE = { width: 780, height: 1688 } as const;
export const HOME_QR_SIZE = { width: 900, height: 1100 } as const;
export const HOME_OWNER_FALLBACK_SIZE = { width: 1200, height: 565 } as const;

export const GUEST_SHOT_LOCALES = ['en', 'vi'] as const;
export type GuestShotLocale = (typeof GUEST_SHOT_LOCALES)[number];
export type GuestShotKind = 'menu' | 'detail' | 'cart';

/** Locales with a real mobile-width (780×1688) owner inbox shot. */
const OWNER_PHONE_LOCALES = new Set<string>([
  // Add 'en' | 'vi' | 'zh' | 'ja' when those captures land in public/images/home/.
]);

const OWNER_FALLBACK_SRC = '/images/home/owner-orders.webp';

export function guestShotLocale(pageLocale: string): GuestShotLocale {
  return pageLocale === 'vi' ? 'vi' : 'en';
}

export function homeGuestSrc(kind: GuestShotKind, pageLocale: string): string {
  return `/images/home/${kind}-${guestShotLocale(pageLocale)}.webp`;
}

export type OwnerShot = {
  src: string;
  width: number;
  height: number;
  isPhone: boolean;
  isFallback: boolean;
};

export function homeOwnerShot(pageLocale: string): OwnerShot {
  if (OWNER_PHONE_LOCALES.has(pageLocale)) {
    return {
      src: `/images/home/owner-orders-${pageLocale}.webp`,
      width: HOME_PHONE_SIZE.width,
      height: HOME_PHONE_SIZE.height,
      isPhone: true,
      isFallback: false,
    };
  }

  return {
    src: OWNER_FALLBACK_SRC,
    width: HOME_OWNER_FALLBACK_SIZE.width,
    height: HOME_OWNER_FALLBACK_SIZE.height,
    isPhone: false,
    isFallback: true,
  };
}
