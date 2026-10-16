/*
 * IndexNow 提交脚本（taomenu issue #13）：抓取线上 sitemap（支持 sitemap index），把全部 URL 推送给 IndexNow（Bing/Yandex 等）。
 * key 文件：public/d341f3f010e8279210e14ed867664e82.txt（随 Worker 静态资源上线，带扩展名，不经过 middleware）。
 *
 * 用法：
 *   pnpm indexnow --dry-run   # 只打印，不发送
 *   pnpm indexnow             # 正式提交
 * deploy 脚本部署成功后会自动跑一次，失败不影响部署。
 */

const HOST = 'menu.dyqr.me';
const KEY = 'd341f3f010e8279210e14ed867664e82';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP_URL = `https://${HOST}/sitemap.xml`;
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const BATCH_SIZE = 10000;
const MAX_SITEMAPS = 50;

function extractLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) =>
    (m[1] ?? '').replace(/&amp;/g, '&').trim(),
  );
}

async function fetchSitemapUrls(): Promise<string[]> {
  const queue = [SITEMAP_URL];
  const seen = new Set<string>();
  const urls = new Set<string>();
  while (queue.length > 0 && seen.size < MAX_SITEMAPS) {
    const sitemap = queue.shift() as string;
    if (seen.has(sitemap)) continue;
    seen.add(sitemap);
    const response = await fetch(`${sitemap}${sitemap.includes('?') ? '&' : '?'}cb=${Date.now()}`);
    if (!response.ok) throw new Error(`抓取 sitemap 失败：${sitemap} HTTP ${response.status}`);
    const xml = await response.text();
    const locs = extractLocs(xml);
    if (/<sitemapindex[\s>]/.test(xml)) queue.push(...locs);
    else for (const loc of locs) if (loc) urls.add(loc);
  }
  return [...urls];
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const urls = await fetchSitemapUrls();
  if (urls.length === 0) throw new Error('sitemap 中没有解析到任何 URL，中止');

  const foreign = urls.filter((url) => new URL(url).host !== HOST);
  if (foreign.length > 0)
    throw new Error(`sitemap 中存在非 ${HOST} 的 URL，中止：\n${foreign.join('\n')}`);

  console.log(`共 ${urls.length} 条 URL`);
  for (const url of urls) console.log(`  ${url}`);
  if (isDryRun) {
    console.log('\n--dry-run：未发送。');
    return;
  }

  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const urlList = urls.slice(i, i + BATCH_SIZE);
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
    });
    // 200/202 = 已接受；403 = key 校验失败；422 = URL 与 host 不符；429 = 提交太频繁
    console.log(
      `IndexNow 响应（第 ${i / BATCH_SIZE + 1} 批，${urlList.length} 条）：HTTP ${response.status} ${response.statusText}`,
    );
    const body = await response.text();
    if (body) console.log(body);
    if (response.status !== 200 && response.status !== 202) process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
