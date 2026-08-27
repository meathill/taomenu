import { describe, expect, it } from 'vitest';
import {
  buildArticlePayload,
  isArticleChanged,
  LOCALE_MAP,
  loadAllBlogArticles,
  type ParsedArticle,
} from './sync-cms-articles';

describe('sync-cms-articles', () => {
  describe('LOCALE_MAP', () => {
    it('正确映射所有语言到 CMS locale', () => {
      expect(LOCALE_MAP.vi).toBe('vi');
      expect(LOCALE_MAP.en).toBe('en');
      expect(LOCALE_MAP.zh).toBe('zh-CN');
      expect(LOCALE_MAP.ja).toBe('ja');
    });
  });

  describe('loadAllBlogArticles', () => {
    it('能够成功加载所有 32 篇博客 Markdown 文件', () => {
      const articles = loadAllBlogArticles();
      expect(articles.length).toBe(32);

      const viArticles = articles.filter((a) => a.folderLocale === 'vi');
      const enArticles = articles.filter((a) => a.folderLocale === 'en');
      const zhArticles = articles.filter((a) => a.folderLocale === 'zh');
      const jaArticles = articles.filter((a) => a.folderLocale === 'ja');

      expect(viArticles.length).toBe(8);
      expect(enArticles.length).toBe(8);
      expect(zhArticles.length).toBe(8);
      expect(jaArticles.length).toBe(8);

      for (const article of articles) {
        expect(article.title).toBeTruthy();
        expect(article.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        expect(article.summary).toBeTruthy();
        expect(article.status).toBe('published');
        expect(article.bodyMarkdown).toBeTruthy();
        expect(article.author).toBe('TaoMenu');
        expect(article.publishedAt).toBeTruthy();
      }
    });

    it('所有 8 个 slug 在 4 种语言中完整对齐', () => {
      const articles = loadAllBlogArticles();
      const expectedSlugs = [
        'order-bang-qr-thanh-toan-tai-quay',
        'menu-dien-tu-la-gi',
        'cach-tao-menu-qr-cho-nha-hang',
        'qr-order-co-can-may-pos-khong',
        'order-qr-co-can-thanh-toan-online-khong',
        'menu-da-ngon-ngu-cho-khach-du-lich',
        'quan-an-nho-co-can-may-pos-khong',
        'phan-biet-menu-qr-va-qr-order',
      ].sort();

      for (const loc of ['vi', 'en', 'zh', 'ja']) {
        const slugs = articles
          .filter((a) => a.folderLocale === loc)
          .map((a) => a.slug)
          .sort();
        expect(slugs).toEqual(expectedSlugs);
      }
    });
  });

  describe('buildArticlePayload', () => {
    it('正确生成符合 Payload REST 规范的请求体', () => {
      const mockArticle: ParsedArticle = {
        filePath: '/test/apps/website/content/blog/zh/test-post.md',
        relPath: 'apps/website/content/blog/zh/test-post.md',
        folderLocale: 'zh',
        cmsLocale: 'zh-CN',
        title: '测试文章标题',
        slug: 'test-post',
        summary: '这是摘要',
        bodyMarkdown: '# 标题\n\n正文内容',
        status: 'published',
        publishedAt: '2026-08-26T00:00:00.000Z',
        author: 'TaoMenu',
        tags: ['标签1', '标签2'],
        keywords: ['关键词1'],
        seoTitle: 'SEO标题',
        seoDescription: 'SEO描述',
      };

      const payload = buildArticlePayload(mockArticle);
      expect(payload.site).toBe('taomenu');
      expect(payload.locale).toBe('zh-CN');
      expect(payload.title).toBe('测试文章标题');
      expect(payload.slug).toBe('test-post');
      expect(payload.status).toBe('published');
      expect(payload._status).toBe('published');
      expect(payload.tags).toEqual([{ value: '标签1' }, { value: '标签2' }]);
      expect(payload.keywords).toEqual([{ value: '关键词1' }]);
    });
  });

  describe('isArticleChanged', () => {
    const mockArticle: ParsedArticle = {
      filePath: '/test/apps/website/content/blog/vi/test.md',
      relPath: 'apps/website/content/blog/vi/test.md',
      folderLocale: 'vi',
      cmsLocale: 'vi',
      title: 'Tiêu đề',
      slug: 'test',
      summary: 'Tóm tắt',
      bodyMarkdown: '# Tiêu đề\n\nNội dung',
      status: 'published',
      publishedAt: '2026-08-26T00:00:00.000Z',
      author: 'TaoMenu',
      tags: [],
      keywords: [],
      seoTitle: 'Tiêu đề',
      seoDescription: 'Tóm tắt',
    };

    it('当内容一致时返回 false', () => {
      const existing = {
        id: 123,
        site: 'taomenu',
        locale: 'vi',
        slug: 'test',
        title: 'Tiêu đề',
        status: 'published',
        summary: 'Tóm tắt',
        bodyMarkdown: '# Tiêu đề\n\nNội dung',
      };
      expect(isArticleChanged(existing, mockArticle)).toBe(false);
    });

    it('当标题、摘要或正文变化时返回 true', () => {
      const existing = {
        id: 123,
        site: 'taomenu',
        locale: 'vi',
        slug: 'test',
        title: 'Tiêu đề cũ',
        status: 'published',
        summary: 'Tóm tắt',
        bodyMarkdown: '# Tiêu đề\n\nNội dung',
      };
      expect(isArticleChanged(existing, mockArticle)).toBe(true);
    });
  });
});
