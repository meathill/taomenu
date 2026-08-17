import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');

const rulePaths = headers
  .split('\n')
  .filter((line) => line.startsWith('/'))
  .map((line) => line.trim());

// 实时/用户态业务，任何缓存都可能造成跨门店、跨用户或过期数据。
const DYNAMIC_PATHS = ['/app', '/m', '/terminal', '/api', '/login', '/admin', '/agent', '/qa-menu'];

describe('public/_headers 缓存边界', () => {
  it('静态 chunk 配一年 immutable 缓存', () => {
    expect(rulePaths).toContain('/_next/static/*');
    expect(headers).toContain('Cache-Control: public,max-age=31536000,immutable');
  });

  it('实时/用户态路径不配任何缓存头', () => {
    const hit = rulePaths.find((rule) =>
      DYNAMIC_PATHS.some((path) => rule === path || rule.startsWith(path)),
    );
    expect(hit, `动态路径不应有缓存规则，命中: ${hit ?? ''}`).toBeUndefined();
  });
});
