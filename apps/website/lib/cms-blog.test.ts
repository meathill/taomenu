import { describe, expect, it } from 'vitest';

import { extractTitle, parseCmsArticle, parseCmsArticlesList } from './cms-blog';

const VALID_DOC = {
  slug: 'qr-menu-vs-qr-ordering',
  locale: 'vi',
  status: 'published',
  summary: 'Khác biệt cốt lõi giữa menu QR và order qua QR.',
  bodyMarkdown: '# Menu QR vs đặt món qua QR\n\nNội dung bài viết.',
  publishedAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-02T00:00:00.000Z',
};

describe('extractTitle', () => {
  it('取第一个标题并去掉行内标记', () => {
    expect(extractTitle('# **Hello** world\n\nbody')).toBe('Hello world');
    expect(extractTitle('## Second wins when no h1')).toBe('Second wins when no h1');
    expect(extractTitle('no heading')).toBe('');
  });
});

describe('parseCmsArticle', () => {
  it('接受完整 published 文档并提取标题', () => {
    const post = parseCmsArticle(VALID_DOC, 'vi');
    expect(post).not.toBeNull();
    expect(post?.title).toBe('Menu QR vs đặt món qua QR');
    expect(post?.slug).toBe('qr-menu-vs-qr-ordering');
    expect(post?.updatedAt).toBe('2026-08-02T00:00:00.000Z');
  });

  it('拒绝 draft、locale 不匹配或缺字段', () => {
    expect(parseCmsArticle({ ...VALID_DOC, status: 'draft' }, 'vi')).toBeNull();
    expect(parseCmsArticle({ ...VALID_DOC }, 'en')).toBeNull();
    expect(parseCmsArticle({ ...VALID_DOC, slug: '' }, 'vi')).toBeNull();
    expect(parseCmsArticle({ ...VALID_DOC, bodyMarkdown: undefined }, 'vi')).toBeNull();
    expect(parseCmsArticle('garbage', 'vi')).toBeNull();
  });
});

describe('parseCmsArticlesList', () => {
  it('按 publishedAt 倒序并过滤无效项', () => {
    const older = { ...VALID_DOC, slug: 'old-post', publishedAt: '2026-07-01T00:00:00.000Z' };
    const newer = { ...VALID_DOC, slug: 'new-post' };
    const posts = parseCmsArticlesList({ docs: [older, newer, null] }, 'vi');
    expect(posts.map((post) => post.slug)).toEqual(['new-post', 'old-post']);
  });
});
