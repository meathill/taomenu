/**
 * Locale-aware marketing screenshots.
 *
 * Guest menu / detail / cart: only locales the QA store has actually published
 * (Free plan = base + one more → vi and en). Other page locales fall back to en.
 * Owner inbox: mobile-width captures in en, vi, zh, and ja (owner chrome matches
 * the page locale). Unknown locales fall back to the English owner shot.
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

export function homeOwnerShot(pageLocale: string): OwnerShot {
  const locale = ownerShotLocale(pageLocale);
  return {
    src: `/images/home/owner-orders-${locale}.webp`,
    width: HOME_OWNER_PHONE_SIZE.width,
    height: HOME_OWNER_PHONE_SIZE.height,
  };
}
