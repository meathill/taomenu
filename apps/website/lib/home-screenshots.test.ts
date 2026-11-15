import { describe, expect, it } from 'vitest';
import {
  guestShotLocale,
  HOME_OWNER_FALLBACK_SIZE,
  HOME_PHONE_SIZE,
  homeGuestSrc,
  homeOwnerShot,
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
  it('uses the shared fallback until per-locale mobile captures exist', () => {
    for (const locale of ['en', 'vi', 'zh', 'ja']) {
      const shot = homeOwnerShot(locale);
      expect(shot.isFallback).toBe(true);
      expect(shot.isPhone).toBe(false);
      expect(shot.src).toBe('/images/home/owner-orders.webp');
      expect(shot).toMatchObject(HOME_OWNER_FALLBACK_SIZE);
    }
  });

  it('keeps the phone intrinsic size constant for future mobile shots', () => {
    expect(HOME_PHONE_SIZE).toEqual({ width: 780, height: 1688 });
  });
});
