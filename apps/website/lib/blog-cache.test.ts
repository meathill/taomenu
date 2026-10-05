import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const blogIndex = readFileSync(new URL('../app/[locale]/blog/page.tsx', import.meta.url), 'utf8');
const blogPost = readFileSync(
  new URL('../app/[locale]/blog/[slug]/page.tsx', import.meta.url),
  'utf8',
);
const landing = readFileSync(new URL('../app/[locale]/[slug]/page.tsx', import.meta.url), 'utf8');
const middleware = readFileSync(new URL('../middleware.ts', import.meta.url), 'utf8');

describe('博客缓存与落地页对齐（issue #12）', () => {
  it('博客列表/详情使用 force-static（与落地页同模式）', () => {
    expect(landing).toContain("export const dynamic = 'force-static'");
    expect(blogIndex).toContain("export const dynamic = 'force-static'");
    expect(blogPost).toContain("export const dynamic = 'force-static'");
    expect(blogIndex).not.toContain('export const revalidate');
    expect(blogPost).not.toContain('export const revalidate');
  });

  it('博客详情预渲染 generateStaticParams', () => {
    expect(blogPost).toContain('generateStaticParams');
  });

  it('middleware 对日文旧越南语 slug 做 301', () => {
    expect(middleware).toContain('JA_BLOG_SLUG_REDIRECTS');
    expect(middleware).toContain('301');
  });
});
