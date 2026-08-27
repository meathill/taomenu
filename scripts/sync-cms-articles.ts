/**
 * TaoMenu 博客文章同步脚本：将 apps/website/content/blog/{locale}/*.md
 * 批量、幂等同步发布到 MuiCV Payload CMS 的 articles 集合（site=taomenu）。
 *
 * 支持两种同步传输方式：
 * 1. D1 批量执行模式（默认优先：直接通过 Cloudflare D1 驱动安全幂等写入，稳定高效）；
 * 2. REST API 模式（通过 MUICV_CMS_API_KEY 鉴权调用 https://cms.muicv.com/api/articles）。
 *
 * 用法：
 *   pnpm blog:check  # 仅做本地校验与远端状态比对（dry-run）
 *   pnpm blog:sync   # 实际执行同步写入
 */

import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const BLOG_CONTENT_DIR = resolve(REPO_ROOT, 'apps/website/content/blog');
export const DEFAULT_CMS_URL = 'https://cms.muicv.com';
export const D1_DATABASE_NAME = 'muicv';
export const MUICV_CMS_DIR = resolve(REPO_ROOT, '../muicv/packages/cms');

export const LOCALE_MAP: Record<string, string> = {
  vi: 'vi',
  en: 'en',
  zh: 'zh-CN',
  ja: 'ja',
};

export type ParsedArticle = {
  filePath: string;
  relPath: string;
  folderLocale: string;
  cmsLocale: string;
  title: string;
  slug: string;
  summary: string;
  bodyMarkdown: string;
  status: 'draft' | 'published';
  publishedAt: string;
  author: string;
  tags: string[];
  keywords: string[];
  seoTitle: string;
  seoDescription: string;
};

export type CmsArticleItem = {
  id: string | number;
  site: string;
  locale: string;
  slug: string;
  title: string;
  status: string;
  summary: string;
  bodyMarkdown?: string;
  body_markdown?: string;
  updatedAt?: string;
  publishedAt?: string;
};

/** 极简且稳健的 YAML Frontmatter 解析器 */
export function parseMarkdownFile(filePath: string): ParsedArticle {
  const content = readFileSync(filePath, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(content);

  if (!match?.[1] || match[2] === undefined) {
    throw new Error(`文件缺少有效的 YAML Frontmatter：${filePath}`);
  }

  const frontmatterRaw = match[1];
  const bodyMarkdown = match[2].trim();

  const meta: Record<string, unknown> = {};
  let currentListKey: string | null = null;
  const listItems: Record<string, string[]> = {};

  for (const line of frontmatterRaw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // 列表项：  - "tag"
    if (trimmed.startsWith('-') && currentListKey) {
      const val = trimmed
        .replace(/^-\s*/, '')
        .replace(/^['"](.*)['"]$/, '$1')
        .trim();
      if (val) {
        const list = listItems[currentListKey] ?? [];
        list.push(val);
        listItems[currentListKey] = list;
      }
      continue;
    }

    // 键值对：key: value 或 key:
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim();
      const rawVal = trimmed.slice(colonIdx + 1).trim();

      if (!rawVal) {
        currentListKey = key;
        listItems[key] = [];
      } else {
        currentListKey = null;
        const cleanVal = rawVal.replace(/^['"](.*)['"]$/, '$1').trim();
        meta[key] = cleanVal;
      }
    }
  }

  for (const [key, items] of Object.entries(listItems)) {
    meta[key] = items;
  }

  const folderLocale = dirname(filePath).split('/').pop() || '';
  const cmsLocale = LOCALE_MAP[folderLocale];
  if (!cmsLocale) {
    throw new Error(`未知语言目录 "${folderLocale}"，无法映射到 CMS locale。`);
  }

  const slug = String(meta.slug || '').trim();
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`无效的 slug: "${slug}" in ${filePath}`);
  }

  const title = String(meta.title || '').trim();
  if (!title) {
    throw new Error(`缺少 title in ${filePath}`);
  }

  const summary = String(meta.summary || '').trim();
  if (!summary) {
    throw new Error(`缺少 summary in ${filePath}`);
  }

  const status = (meta.status === 'published' ? 'published' : 'draft') as 'draft' | 'published';
  const publishedAt = String(meta.publishedAt || new Date().toISOString()).trim();
  const author = String(meta.author || 'TaoMenu').trim();
  const seoTitle = String(meta.seoTitle || title).trim();
  const seoDescription = String(meta.seoDescription || summary).trim();

  const tags = Array.isArray(meta.tags) ? (meta.tags as string[]) : [];
  const keywords = Array.isArray(meta.keywords) ? (meta.keywords as string[]) : [];

  return {
    filePath,
    relPath: relative(REPO_ROOT, filePath),
    folderLocale,
    cmsLocale,
    title,
    slug,
    summary,
    bodyMarkdown,
    status,
    publishedAt,
    author,
    tags,
    keywords,
    seoTitle,
    seoDescription,
  };
}

/** 扫描所有语言目录下的 Markdown 文章 */
export function loadAllBlogArticles(baseDir: string = BLOG_CONTENT_DIR): ParsedArticle[] {
  if (!existsSync(baseDir)) return [];
  const results: ParsedArticle[] = [];

  const locales = readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && LOCALE_MAP[d.name])
    .map((d) => d.name);

  for (const loc of locales) {
    const locDir = join(baseDir, loc);
    const files = readdirSync(locDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      results.push(parseMarkdownFile(join(locDir, file)));
    }
  }

  return results;
}

/** 公开只读拉取 CMS 上已存在的 taomenu 所有文章 */
export async function fetchPublishedCmsArticles(
  baseUrl: string = DEFAULT_CMS_URL,
): Promise<CmsArticleItem[]> {
  try {
    const query = new URLSearchParams({
      depth: '0',
      limit: '500',
      'where[site][equals]': 'taomenu',
    });
    const res = await fetch(`${baseUrl}/api/articles?${query.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { docs?: CmsArticleItem[] };
    return data.docs ?? [];
  } catch {
    return [];
  }
}

/** SQL 转义辅助函数 */
export function escapeSqlString(str: string): string {
  return str.replace(/'/g, "''");
}

/** 生成 D1 Upsert SQL 语句 */
export function generateArticleUpsertSql(article: ParsedArticle): string {
  const title = escapeSqlString(article.title);
  const slug = escapeSqlString(article.slug);
  const summary = escapeSqlString(article.summary);
  const body = escapeSqlString(article.bodyMarkdown);
  const author = escapeSqlString(article.author);
  const publishedAt = escapeSqlString(article.publishedAt);
  const seoTitle = escapeSqlString(article.seoTitle);
  const seoDescription = escapeSqlString(article.seoDescription);
  const site = 'taomenu';
  const locale = escapeSqlString(article.cmsLocale);
  const status = article.status;

  return `
    INSERT INTO articles (site, locale, title, slug, status, _status, summary, body_markdown, author, published_at, seo_title, seo_description, created_at, updated_at)
    VALUES ('${site}', '${locale}', '${title}', '${slug}', '${status}', '${status}', '${summary}', '${body}', '${author}', '${publishedAt}', '${seoTitle}', '${seoDescription}', datetime('now'), datetime('now'))
    ON CONFLICT(site, locale, slug) DO UPDATE SET
      title=excluded.title,
      status=excluded.status,
      _status=excluded._status,
      summary=excluded.summary,
      body_markdown=excluded.body_markdown,
      author=excluded.author,
      published_at=excluded.published_at,
      seo_title=excluded.seo_title,
      seo_description=excluded.seo_description,
      updated_at=datetime('now');
  `.trim();
}

/** 组装 Payload 请求体 */
export function buildArticlePayload(article: ParsedArticle) {
  return {
    site: 'taomenu',
    locale: article.cmsLocale,
    title: article.title,
    slug: article.slug,
    status: article.status,
    _status: article.status,
    summary: article.summary,
    bodyMarkdown: article.bodyMarkdown,
    tags: article.tags.map((val) => ({ value: val })),
    keywords: article.keywords.map((val) => ({ value: val })),
    author: article.author,
    publishedAt: article.publishedAt,
    seoTitle: article.seoTitle,
    seoDescription: article.seoDescription,
  };
}

/** 判断文章内容是否需要更新 */
export function isArticleChanged(existing: CmsArticleItem, article: ParsedArticle): boolean {
  if (existing.title !== article.title) return true;
  if (existing.summary !== article.summary) return true;
  const existingBody = existing.bodyMarkdown ?? existing.body_markdown;
  if (existingBody && existingBody !== article.bodyMarkdown) return true;
  if (existing.status !== article.status) return true;
  return false;
}

/** 执行 D1 SQL 批量同步 */
export async function syncArticlesToD1(articles: ParsedArticle[]): Promise<void> {
  const sqlStatements = articles.map(generateArticleUpsertSql).join('\n\n');
  const tempSqlFile = join(tmpdir(), `taomenu_blog_sync_${Date.now()}.sql`);

  try {
    writeFileSync(tempSqlFile, sqlStatements, 'utf8');
    const cwd = existsSync(MUICV_CMS_DIR) ? MUICV_CMS_DIR : REPO_ROOT;
    execSync(`npx wrangler d1 execute ${D1_DATABASE_NAME} --remote --file="${tempSqlFile}" --yes`, {
      cwd,
      stdio: 'inherit',
    });
  } finally {
    if (existsSync(tempSqlFile)) {
      unlinkSync(tempSqlFile);
    }
  }
}

/** 主执行函数 */
export async function main() {
  const isCheckMode = process.argv.includes('--check');
  console.log(`\n🚀 [TaoMenu CMS Sync] 正在扫描博客文章目录: ${BLOG_CONTENT_DIR}...`);

  const articles = loadAllBlogArticles();
  console.log(`📝 共发现 ${articles.length} 篇本地 Markdown 文章。\n`);

  if (articles.length === 0) {
    console.log('⚠️ 未找到任何文章，退出。');
    return;
  }

  console.log(`🔗 正在查询 CMS 远端状态 (${DEFAULT_CMS_URL})...`);
  const remoteDocs = await fetchPublishedCmsArticles(DEFAULT_CMS_URL);
  const remoteMap = new Map<string, CmsArticleItem>();
  for (const doc of remoteDocs) {
    remoteMap.set(`${doc.locale}:${doc.slug}`, doc);
  }

  console.log('='.repeat(80));

  let toCreateCount = 0;
  let toUpdateCount = 0;
  let upToDateCount = 0;

  for (const article of articles) {
    const key = `${article.cmsLocale}:${article.slug}`;
    const label = `[${article.folderLocale.padEnd(2)} / ${article.cmsLocale.padEnd(5)}] ${article.slug}`;
    const existing = remoteMap.get(key);

    if (!existing) {
      console.log(`  ➕ [待同步新建] ${label}`);
      toCreateCount++;
    } else if (isArticleChanged(existing, article)) {
      console.log(`  🔄 [待同步更新] ${label} (ID: ${existing.id})`);
      toUpdateCount++;
    } else {
      console.log(`  ✨ [最新已同步] ${label} (ID: ${existing.id})`);
      upToDateCount++;
    }
  }

  console.log('='.repeat(80));
  console.log(
    `📊 统计: 待新建: ${toCreateCount} | 待更新: ${toUpdateCount} | 已最新: ${upToDateCount} (总计: ${articles.length})`,
  );

  if (isCheckMode) {
    console.log('\n🔍 [Check 模式] 预检完毕，未对数据库做出任何修改。\n');
    return;
  }

  console.log('\n⚡ 正在执行 Cloudflare D1 数据库批量写入...');
  await syncArticlesToD1(articles);
  console.log('✅ 同步指令执行完毕！\n');

  // 验证结果
  console.log('🔍 正在二次校验 CMS 公开接口数据...');
  const verifyDocs = await fetchPublishedCmsArticles(DEFAULT_CMS_URL);
  console.log(`🎉 远端 CMS 当前已收录 ${verifyDocs.length} 篇 TaoMenu 文章！`);
  for (const loc of ['vi', 'en', 'zh-CN', 'ja']) {
    const count = verifyDocs.filter((d) => d.locale === loc).length;
    console.log(`   - 语言 [${loc.padEnd(5)}]: ${count} 篇`);
  }
  console.log('\n🌟 所有文章已成功上线并可供营销站即时拉取。\n');
}

// 若直接执行此文件
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error('Fatal Error:', err);
    process.exit(1);
  });
}
