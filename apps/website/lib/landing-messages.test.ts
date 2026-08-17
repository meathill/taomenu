import { readFileSync } from 'node:fs';
import { LOCALES } from '@taomenu/shared';
import { describe, expect, it } from 'vitest';
import { LANDING_SLUGS } from '@/lib/landing';

describe('landing messages', () => {
  it('每个 landing slug 在全部 locale 的 messages 里都有完整字段', () => {
    for (const locale of LOCALES) {
      const messages = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')) as {
        landing: Record<string, unknown>;
      };
      for (const slug of LANDING_SLUGS) {
        const block = messages.landing?.[slug] as
          | { title?: unknown; description?: unknown; answer?: unknown; faq?: unknown }
          | undefined;
        expect(block, `${locale}/${slug} 缺少 landing 文案`).toBeDefined();
        expect(typeof block?.title, `${locale}/${slug}.title`).toBe('string');
        expect(typeof block?.description, `${locale}/${slug}.description`).toBe('string');
        expect(typeof block?.answer, `${locale}/${slug}.answer`).toBe('string');
        const faq = block?.faq;
        expect(Array.isArray(faq), `${locale}/${slug}.faq`).toBe(true);
        expect((faq as unknown[]).length, `${locale}/${slug}.faq 为空`).toBeGreaterThan(0);
      }
    }
  });
});
