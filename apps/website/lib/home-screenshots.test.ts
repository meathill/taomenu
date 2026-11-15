import { describe, expect, it } from 'vitest';
import {
  guestShotLocale,
  HOME_OWNER_PHONE_SIZE,
  homeGuestSrc,
  homeHeroSlides,
  homeOwnerShot,
  OWNER_PHONE_LOCALES,
  ownerShotLocale,
} from './home-screenshots';

describe('guestShotLocale', () => {
  it('uses the Vietnamese menu on the Vietnamese page', () => {
    expect(guestShotLocale('vi')).toBe('vi');
  });

  it('falls back to English when the store has no published zh/ja menu', () => {
    expect(guestShotLocale('en')).toBe('en');
    expect(guestShotLocale('zh')).toBe('en');
    expect(guestShotLocale('ja')).toBe('en');
  });
});

describe('homeGuestSrc', () => {
  it('picks per-locale guest assets and falls back to en', () => {
    expect(homeGuestSrc('menu', 'vi')).toBe('/images/home/menu-vi.webp');
    expect(homeGuestSrc('detail', 'en')).toBe('/images/home/detail-en.webp');
    expect(homeGuestSrc('cart', 'zh')).toBe('/images/home/cart-en.webp');
  });
});

describe('homeOwnerShot', () => {
  it('uses a mobile owner inbox shot for every site locale', () => {
    for (const locale of OWNER_PHONE_LOCALES) {
      const shot = homeOwnerShot(locale);
      expect(shot.src).toBe(`/images/home/owner-orders-${locale}.webp`);
      expect(shot).toMatchObject(HOME_OWNER_PHONE_SIZE);
    }
  });

  it('falls back to the English owner shot for an unknown locale', () => {
    expect(ownerShotLocale('fr')).toBe('en');
    expect(homeOwnerShot('fr').src).toBe('/images/home/owner-orders-en.webp');
  });
});

describe('homeHeroSlides', () => {
  it('returns four slides in story order', () => {
    const slides = homeHeroSlides('en');
    expect(slides.map((slide) => slide.id)).toEqual(['menu', 'detail', 'cart', 'orders']);
  });

  it('uses Vietnamese guest shots and the Vietnamese owner inbox on /vi', () => {
    const byId = Object.fromEntries(homeHeroSlides('vi').map((slide) => [slide.id, slide.src]));
    expect(byId).toEqual({
      menu: '/images/home/menu-vi.webp',
      detail: '/images/home/detail-vi.webp',
      cart: '/images/home/cart-vi.webp',
      orders: '/images/home/owner-orders-vi.webp',
    });
  });

  it('falls back to English guest shots on zh and ja, with matching owner chrome', () => {
    const zh = Object.fromEntries(homeHeroSlides('zh').map((slide) => [slide.id, slide.src]));
    expect(zh.menu).toBe('/images/home/menu-en.webp');
    expect(zh.orders).toBe('/images/home/owner-orders-zh.webp');
    const ja = Object.fromEntries(homeHeroSlides('ja').map((slide) => [slide.id, slide.src]));
    expect(ja.cart).toBe('/images/home/cart-en.webp');
    expect(ja.orders).toBe('/images/home/owner-orders-ja.webp');
  });
});
