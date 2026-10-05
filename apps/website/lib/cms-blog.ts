import { DEFAULT_LOCALE, LOCALES, type Locale } from '@taomenu/shared';
import {
  getBlogSlugForLocale,
  resolveBlogContentKey,
  toCmsLookupSlugs,
  toPublicBlogSlug,
} from '@/lib/blog-slugs';

/** muicv Payload CMS 的 articles 集合（site=taomenu）只读客户端。
 *  匿名只读 status=published；编辑统一在 CMS 后台进行。 */

const CMS_BASE_URL = process.env.TAOMENU_CMS_URL?.trim() || 'https://cms.muicv.com';

/** 是否处于生产构建期（Workers Builds / 本地 next build）。
 *  构建期 platformProxy 会给 MUICV_CMS 一个不可用的本地 stub（fetch 相对路径直接
 *  抛 "Failed to parse URL"），因此构建期必须走公网 URL，运行时才用 binding。 */
function isBuildTime(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/** 运行时（worker 内）优先走 service binding：同账号内网调用，不出公网。
 *  build 期（Node 进程）拿不到可用 binding，回落公网 URL。 */
async function resolveCmsFetch(): Promise<{ fetchImpl: typeof fetch; baseUrl: string }> {
  if (!isBuildTime()) {
    try {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');
      const { env } = await getCloudflareContext({ async: true });
      if (env.MUICV_CMS && typeof env.MUICV_CMS.fetch === 'function') {
        const binding = env.MUICV_CMS;
        return {
          fetchImpl: ((input, init) => binding.fetch(input, init)) as typeof fetch,
          baseUrl: CMS_BASE_URL,
        };
      }
    } catch {
      // 无 Cloudflare runtime（本地 Node 脚本等）：走公网
    }
  }
  return { fetchImpl: fetch, baseUrl: CMS_BASE_URL };
}

/** taomenu 站点 locale → CMS articles.locale（CMS 用 BCP-47 全称）。 */
const CMS_LOCALES: Record<Locale, string> = {
  en: 'en',
  zh: 'zh-CN',
  ja: 'ja',
  vi: 'vi',
};

type CmsArticleRaw = {
  slug?: unknown;
  locale?: unknown;
  status?: unknown;
  summary?: unknown;
  bodyMarkdown?: unknown;
  publishedAt?: unknown;
  updatedAt?: unknown;
};

export type BlogPost = {
  slug: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  publishedAt: string;
  updatedAt: string;
};

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

/** 从 markdown 提取第一个标题作为文章标题（seed 与后台都不单独存 title 展示位）。 */
export function extractTitle(markdown: string): string {
  for (const line of markdown.split('\n')) {
    const match = /^#{1,3}\s+(.+?)\s*#*$/.exec(line.trim());
    if (match?.[1]) {
      return match[1]
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/[*_`~]/g, '')
        .trim();
    }
  }
  return '';
}

export function parseCmsArticle(value: unknown, expectedLocale: string): BlogPost | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const doc = value as CmsArticleRaw;

  const slug = readString(doc.slug);
  const bodyMarkdown = readString(doc.bodyMarkdown);
  const publishedAt = readString(doc.publishedAt);
  const updatedAt = readString(doc.updatedAt) ?? publishedAt;
  const summary = readString(doc.summary);

  if (!slug || !bodyMarkdown || !publishedAt || !updatedAt || !summary) {
    return null;
  }
  if (doc.status !== 'published') {
    return null;
  }
  if (doc.locale !== expectedLocale) {
    return null;
  }

  return {
    slug,
    title: extractTitle(bodyMarkdown) || slug,
    summary,
    bodyMarkdown,
    publishedAt,
    updatedAt,
  };
}

export function parseCmsArticlesList(value: unknown, expectedLocale: string): BlogPost[] {
  if (!value || typeof value !== 'object') {
    return [];
  }
  const docs = (value as { docs?: unknown }).docs;
  if (!Array.isArray(docs)) {
    return [];
  }
  return docs
    .map((doc) => parseCmsArticle(doc, expectedLocale))
    .filter((post): post is BlogPost => post !== null)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

async function fetchCmsDocs(query: URLSearchParams): Promise<unknown | null> {
  try {
    const { fetchImpl, baseUrl } = await resolveCmsFetch();
    // service binding 时 baseUrl 为空串，path 直接作为 URL（Fetcher.fetch 接受相对路径）
    const response = await fetchImpl(`${baseUrl}/api/articles?${query.toString()}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86400 },
    });
    if (!response.ok) {
      console.warn(`[cms-blog] CMS articles HTTP ${response.status}`);
      return null;
    }
    return (await response.json()) as unknown;
  } catch (error) {
    console.warn(`[cms-blog] CMS articles 拉取失败: ${error}`);
    return null;
  }
}

export async function listPublishedPosts(locale: Locale): Promise<BlogPost[]> {
  const query = new URLSearchParams({
    depth: '0',
    limit: '200',
    sort: '-publishedAt',
    'where[site][equals]': 'taomenu',
    'where[status][equals]': 'published',
    'where[locale][equals]': CMS_LOCALES[locale],
  });
  const payload = await fetchCmsDocs(query);
  const posts = payload ? parseCmsArticlesList(payload, CMS_LOCALES[locale]) : [];
  // 对外 URL slug 按 locale 本地化（日文不再暴露越南语 slug）
  return posts.map((post) => ({
    ...post,
    slug: toPublicBlogSlug(post.slug, locale),
  }));
}

export async function getPost(slug: string, locale: Locale): Promise<BlogPost | null> {
  for (const lookupSlug of toCmsLookupSlugs(slug, locale)) {
    const query = new URLSearchParams({
      depth: '0',
      limit: '1',
      'where[site][equals]': 'taomenu',
      'where[status][equals]': 'published',
      'where[locale][equals]': CMS_LOCALES[locale],
      'where[slug][equals]': lookupSlug,
    });
    const payload = await fetchCmsDocs(query);
    if (!payload) {
      continue;
    }
    const post = parseCmsArticlesList(payload, CMS_LOCALES[locale])[0] ?? null;
    if (post) {
      return { ...post, slug: toPublicBlogSlug(post.slug, locale) };
    }
  }
  return null;
}

/** 文章缺当前语言时回退英文（内容原则：宁给英文不给 404）。 */
export async function getPostWithFallback(
  slug: string,
  locale: Locale,
): Promise<{ post: BlogPost; isFallback: boolean }> {
  const local = await getPost(slug, locale);
  if (local) {
    return { post: local, isFallback: false };
  }
  if (locale === DEFAULT_LOCALE || !(LOCALES as readonly string[]).includes(DEFAULT_LOCALE)) {
    return { post: null as unknown as BlogPost, isFallback: false };
  }
  // 跨语言 slug 可能不同：先解析 content key，再查默认语言 slug
  const contentKey = resolveBlogContentKey(slug) ?? slug;
  const englishSlug = getBlogSlugForLocale(contentKey, DEFAULT_LOCALE);
  const english = await getPost(englishSlug, DEFAULT_LOCALE);
  if (!english) {
    return { post: null as unknown as BlogPost, isFallback: false };
  }
  return {
    post: { ...english, slug: toPublicBlogSlug(contentKey, locale) },
    isFallback: true,
  };
}
