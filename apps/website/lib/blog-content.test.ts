import { describe, expect, it } from 'vitest';
import { stripLeadingH1 } from './blog-content';

describe('stripLeadingH1', () => {
  it('移除正文开头的首个 # 一级标题', () => {
    const input = '# 我的文章主标题\n\n正文第一段。\n\n## 小节一\n\n更多内容。';
    const output = stripLeadingH1(input);
    expect(output).toBe('正文第一段。\n\n## 小节一\n\n更多内容。');
  });

  it('保留开头的 h2 标题（当没有 h1 时）', () => {
    const input = '## 直接以二级标题开头\n\n正文内容。';
    const output = stripLeadingH1(input);
    expect(output).toBe('## 直接以二级标题开头\n\n正文内容。');
  });

  it('忽略前置空行并正确移除 h1', () => {
    const input = '\n\n  \n# 开头有空行的标题\n\n正文内容。';
    const output = stripLeadingH1(input);
    expect(output).toBe('正文内容。');
  });

  it('仅移除第一个 h1，不误删正文后续的标题', () => {
    const input = '# 标题一\n\n内容\n\n# 后续的另一个标题\n\n结尾';
    const output = stripLeadingH1(input);
    expect(output).toBe('内容\n\n# 后续的另一个标题\n\n结尾');
  });
});
