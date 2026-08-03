import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_LOCALE, isLocale, type Locale } from '@taomenu/shared';

/** 营销站文档 slug（URL 路径） */
export const DOC_SLUGS = ['about', 'contact-us', 'privacy', 'terms'] as const;
export type DocSlug = (typeof DOC_SLUGS)[number];

export function isDocSlug(value: string): value is DocSlug {
  return (DOC_SLUGS as readonly string[]).includes(value);
}

/**
 * 读取 MDX 正文。构建期 force-static 时用 fs 即可；
 * 若某 locale 缺失则回退英文。
 */
export async function loadDocSource(
  slug: DocSlug,
  locale: string,
): Promise<{ source: string; contentLocale: Locale; usedFallback: boolean }> {
  const contentLocale: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const dir = path.join(process.cwd(), 'content', slug);

  try {
    const source = await readFile(path.join(dir, `${contentLocale}.mdx`), 'utf8');
    return { source, contentLocale, usedFallback: false };
  } catch {
    const source = await readFile(path.join(dir, `${DEFAULT_LOCALE}.mdx`), 'utf8');
    return { source, contentLocale: DEFAULT_LOCALE, usedFallback: true };
  }
}
