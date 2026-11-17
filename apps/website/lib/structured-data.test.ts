import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Google Software App 富结果要求 rating 或 review；没有真实评价时不得声明
// SoftwareApplication（issue #10），否则 Rich Results Test 报关键缺字段错误。
const SOURCES = [
  '../app/[locale]/page.tsx',
  '../components/landing-page.tsx',
  '../app/[locale]/layout.tsx',
] as const;

function readSource(relative: (typeof SOURCES)[number]): [string, string] {
  return [relative, readFileSync(new URL(relative, import.meta.url), 'utf8')];
}

const sources = SOURCES.map(readSource);
const home = readSource('../app/[locale]/page.tsx')[1];
const landing = readSource('../components/landing-page.tsx')[1];
const layout = readSource('../app/[locale]/layout.tsx')[1];

describe('结构化数据不伪造评分（issue #10）', () => {
  it('首页与落地页不声明无评价的 SoftwareApplication', () => {
    for (const [relative, content] of sources) {
      // 只认真正的 JSON-LD 声明，注释里的说明文字不算
      if (!content.includes("'@type': 'SoftwareApplication'")) {
        continue;
      }
      expect(
        content.includes('aggregateRating') || content.includes("'review'"),
        `${relative} 声明了 SoftwareApplication，却没有真实 aggregateRating/review`,
      ).toBe(true);
    }
  });

  it('首页保留 FAQPage 富结果资格', () => {
    expect(home).toContain("'@type': 'FAQPage'");
  });

  it('落地页保留 BreadcrumbList + FAQPage', () => {
    expect(landing).toContain("'@type': 'BreadcrumbList'");
    expect(landing).toContain("'@type': 'FAQPage'");
  });

  it('站点级 Organization + WebSite 仍在 layout', () => {
    expect(layout).toContain("'@type': 'Organization'");
    expect(layout).toContain("'@type': 'WebSite'");
  });
});

describe('博客文章 BlogPosting schema（issue #12）', () => {
  const blogPost = readFileSync(
    new URL('../app/[locale]/blog/[slug]/page.tsx', import.meta.url),
    'utf8',
  );

  it('博客详情声明 BlogPosting 并含必填字段', () => {
    expect(blogPost).toContain("'@type': 'BlogPosting'");
    expect(blogPost).toContain('headline:');
    expect(blogPost).toContain('image:');
    expect(blogPost).toContain('datePublished:');
    expect(blogPost).toContain('author:');
  });

  it('博客详情不移除站点级 schema 依赖（Organization/WebSite 仍在 layout）', () => {
    expect(layout).toContain("'@type': 'Organization'");
    expect(layout).toContain("'@type': 'WebSite'");
  });
});
