import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const routingSource = readFileSync(new URL('../i18n/routing.ts', import.meta.url), 'utf8');

describe('i18n routing', () => {
  it('关闭 next-intl 自动 Link 头，hreflang 只由 HTML metadata 输出', () => {
    expect(routingSource).toMatch(/alternateLinks\s*:\s*false/);
  });
});
