import { readFileSync } from 'node:fs';
import { LOCALES } from '@taomenu/shared';
import { describe, expect, it } from 'vitest';

const GROWTH_KEYS = [
  'growthTitle',
  'growthSubtitle',
  'growthBody',
  'growthMapsTitle',
  'growthMapsBody',
  'growthReviewsTitle',
  'growthReviewsBody',
  'growthSocialTitle',
  'growthSocialBody',
  'growthCta',
  'growthEarlyBird',
  'finalCtaSecondary',
] as const;

describe('homepage growth copy', () => {
  it('四个语言都有托管+获客文案，且早鸟句含日期占位', () => {
    for (const locale of LOCALES) {
      const messages = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')) as {
        home: Record<string, unknown>;
      };
      for (const key of GROWTH_KEYS) {
        const value = messages.home[key];
        expect(typeof value, `${locale}.home.${key}`).toBe('string');
        expect(String(value).trim().length, `${locale}.home.${key} 为空`).toBeGreaterThan(0);
      }
      expect(messages.home.growthEarlyBird as string).toContain('{date}');
    }
  });
});
