import { describe, expect, it } from 'vitest';
import {
  guestShotLocale,
  HOME_OWNER_PHONE_SIZE,
  homeGuestSrc,
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
