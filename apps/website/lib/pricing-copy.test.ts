import { readFileSync } from 'node:fs';
import { getPlanLimits } from '@taomenu/shared';
import { describe, expect, it } from 'vitest';

// issue #17：定价页写的语言数量必须与 PLAN_LIMITS（后端真正执行的限制）一致
const LOCALES = ['en', 'zh', 'vi', 'ja'] as const;

function readPricing(locale: string): Record<string, string> {
  const raw = readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8');
  return (JSON.parse(raw) as { pricing: Record<string, string> }).pricing;
}

describe('定价页语言权益与 PLAN_LIMITS 一致', () => {
  for (const locale of LOCALES) {
    it(locale, () => {
      const pricing = readPricing(locale);
      expect(pricing.freeF2).toContain(String(getPlanLimits('free').maxMenuLocales));
      expect(pricing.proF2).toContain(String(getPlanLimits('pro').maxMenuLocales));
      // issue #25：Free 的照片/PDF 导入次数与 PLAN_LIMITS 一致
      expect(pricing.freeF3).toContain(String(getPlanLimits('free').maxAiMenuImportsPerMonth));
      expect(pricing.proImport).toContain(String(getPlanLimits('pro').maxAiMenuImportsPerMonth));
    });
  }
});
