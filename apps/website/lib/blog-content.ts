/**
 * 博客文章内容辅助函数
 */

/** 移除正文开头的第一个 # 一级标题（避免与页面外壳 header 中的 h1 重复） */
export function stripLeadingH1(markdown: string): string {
  const lines = markdown.split('\n');
  let firstNonEmptyIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line && line.trim()) {
      firstNonEmptyIdx = i;
      break;
    }
  }

  if (firstNonEmptyIdx === -1) {
    return markdown;
  }

  const targetLine = lines[firstNonEmptyIdx];
  if (targetLine && /^#\s+/.test(targetLine.trim())) {
    return lines
      .slice(firstNonEmptyIdx + 1)
      .join('\n')
      .trim();
  }

  return markdown;
}
