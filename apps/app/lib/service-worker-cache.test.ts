import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const serviceWorker = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

describe('service worker cache policy', () => {
  it('不预缓存登录后可能包含业务数据的页面', () => {
    expect(serviceWorker).not.toMatch(/^\s*['"]\/(?:terminal)?['"],?$/m);
  });

  it('只处理同源静态资源，不接管页面和 RSC 请求', () => {
    expect(serviceWorker).toContain("url.pathname.startsWith('/_next/static/')");
    expect(serviceWorker).toContain("url.pathname.startsWith('/brand/')");
    expect(serviceWorker).toContain("url.pathname.startsWith('/icons/')");
    expect(serviceWorker).not.toContain("url.pathname.startsWith('/m/')");
  });
});
