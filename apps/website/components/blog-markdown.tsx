import { Marked } from 'marked';

/**
 * 博客正文专用 marked 实例（与 muicv website 的 MarkdownBody 同思路）：
 * 1. 标题层级地板 h2 —— 页面外壳已有 h1（文章标题），markdown 里写 `#` 会撞 h1；
 * 2. 给标题加 id，方便深链。
 *
 * 用 `new Marked()` 而不是模块级 `marked.use(...)`，避免单例被多次扩展。
 */
const marked = new Marked({
  renderer: {
    heading({ tokens, depth }) {
      const clamped = Math.min(Math.max(depth, 2), 6);
      const text = this.parser.parseInline(tokens);
      const slug = text
        .replace(/<[^>]+>/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w一-鿿-]/g, '');
      const id = slug ? ` id="${slug}"` : '';
      return `<h${clamped}${id}>${text}</h${clamped}>\n`;
    },
  },
});

export function BlogMarkdownBody({ markdown }: { markdown: string }) {
  const html = marked.parse(markdown, { async: false }) as string;

  return (
    // biome-ignore lint/security/noDangerouslySetInnerHtml: marked 输出，CMS 内容是受信任的
    <div className="doc-prose" dangerouslySetInnerHTML={{ __html: html }} />
  );
}
