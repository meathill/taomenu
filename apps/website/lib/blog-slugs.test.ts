import { describe, expect, it } from 'vitest';
import {
  BLOG_POST_SLUGS,
  getBlogSlugForLocale,
  JA_BLOG_SLUG_REDIRECTS,
  JA_BLOG_SLUG_TO_LEGACY,
  resolveBlogContentKey,
  toCmsLookupSlugs,
  toPublicBlogSlug,
} from './blog-slugs';

describe('blog-slugs（issue #12）', () => {
  it('日文公开 slug 不是越南语 slug', () => {
    for (const [key, entry] of Object.entries(BLOG_POST_SLUGS)) {
      expect(entry.ja).not.toBe(key);
      expect(entry.ja).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(JA_BLOG_SLUG_REDIRECTS[key]).toBe(entry.ja);
      expect(JA_BLOG_SLUG_TO_LEGACY[entry.ja]).toBe(key);
    }
  });

  it('resolveBlogContentKey 识别新旧 slug', () => {
    expect(resolveBlogContentKey('order-bang-qr-thanh-toan-tai-quay')).toBe(
      'order-bang-qr-thanh-toan-tai-quay',
    );
    expect(resolveBlogContentKey('qr-chumon-reji-kaikei')).toBe(
      'order-bang-qr-thanh-toan-tai-quay',
    );
    expect(resolveBlogContentKey('unknown-post')).toBeNull();
  });

  it('toPublicBlogSlug 按 locale 输出', () => {
    expect(toPublicBlogSlug('order-bang-qr-thanh-toan-tai-quay', 'ja')).toBe(
      'qr-chumon-reji-kaikei',
    );
    expect(toPublicBlogSlug('qr-chumon-reji-kaikei', 'vi')).toBe(
      'order-bang-qr-thanh-toan-tai-quay',
    );
    expect(getBlogSlugForLocale('menu-dien-tu-la-gi', 'ja')).toBe('dejitaru-menyuu-toha');
  });

  it('toCmsLookupSlugs 日文新旧双向回退', () => {
    expect(toCmsLookupSlugs('qr-chumon-reji-kaikei', 'ja')).toEqual([
      'qr-chumon-reji-kaikei',
      'order-bang-qr-thanh-toan-tai-quay',
    ]);
    expect(toCmsLookupSlugs('order-bang-qr-thanh-toan-tai-quay', 'ja')).toEqual([
      'order-bang-qr-thanh-toan-tai-quay',
      'qr-chumon-reji-kaikei',
    ]);
    expect(toCmsLookupSlugs('order-bang-qr-thanh-toan-tai-quay', 'vi')).toEqual([
      'order-bang-qr-thanh-toan-tai-quay',
    ]);
  });
});
