import { Marked } from 'marked';
import { stripLeadingH1 } from '@/lib/blog-content';
import { MermaidRenderer } from './mermaid-renderer';

/**
 * 博客正文专用 marked 实例：
 * 1. 标题层级地板 h2 —— 页面外壳已有 h1（文章标题），markdown 里写 `#` 会撞 h1；
 * 2. 给标题加 id，方便深链；
 * 3. 对 ```mermaid 代码块特殊渲染，交给客户端 Mermaid 引擎生成高颜值矢量流程图。
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
    code({ text, lang }) {
      if (lang === 'mermaid') {
        const cleanCode = text.trim();
        return `\n<div class="mermaid-diagram my-8 flex justify-center overflow-x-auto rounded-2xl border border-brand-200/70 bg-brand-50/50 p-6 shadow-sm"><pre class="mermaid text-center font-sans">${cleanCode}</pre></div>\n`;
      }
      return `<pre><code class="language-${lang || 'text'}">${text}</code></pre>\n`;
    },
  },
});

export function BlogMarkdownBody({ markdown }: { markdown: string }) {
  const cleanMarkdown = stripLeadingH1(markdown);
  const html = marked.parse(cleanMarkdown, { async: false }) as string;

  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: marked 输出，CMS 内容是受信任的 */}
      <div className="doc-prose" dangerouslySetInnerHTML={{ __html: html }} />
      <MermaidRenderer />
    </>
  );
}
