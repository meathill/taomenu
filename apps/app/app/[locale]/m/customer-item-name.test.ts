import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// issue #23：顾客菜单的菜名（常见“中文 / English”双语）不能被单行截断
const FILES = ['./customer-menu-item-card.tsx'];

function itemNameClassNames(source: string): string[] {
  return [...source.matchAll(/<span className="([^"]+)">\s*\{item\.name\}/g)].map(
    (match) => match[1] ?? '',
  );
}

describe('顾客菜单菜名换行', () => {
  for (const file of FILES) {
    it(`${file} 菜名换行而不截断`, () => {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8');
      const classNames = itemNameClassNames(source);
      expect(classNames).toHaveLength(1);
      expect(classNames[0]).not.toMatch(/\btruncate\b|line-clamp/);
      expect(classNames[0]).toContain('wrap-anywhere');
    });
  }
});
