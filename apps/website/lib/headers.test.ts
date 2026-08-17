import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');

const rulePaths = headers
  .split('\n')
  .filter((line) => line.startsWith('/'))
  .map((line) => line.trim());

describe('public/_headers 缓存边界', () => {
  it('静态 chunk 配一年 immutable 缓存', () => {
    expect(rulePaths).toContain('/_next/static/*');
    expect(headers).toContain('Cache-Control: public,max-age=31536000,immutable');
  });

  it('页面 HTML 不配强缓存，内容更新后需及时生效', () => {
    const pageRules = rulePaths.filter((rule) => rule !== '/_next/static/*');
    expect(pageRules).toEqual([]);
  });
});
