/**
 * 演示菜品图下载：按清单从 Openverse（CC0/商用许可）搜索下载，sips 压到 600px JPEG，
 * 产物存 apps/app/scripts/dish-images/{slug}.jpg。
 *
 * 用法：`pnpm exec tsx scripts/download-dish-images.ts`
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'dish-images');
mkdirSync(OUT_DIR, { recursive: true });

const manifest = JSON.parse(
  readFileSync(path.join(__dirname, 'demo-stores.manifest.json'), 'utf8'),
) as {
  stores: Record<string, { imageKeys: Record<string, string> }>;
};

const QUERIES: Record<string, string> = {
  'goi-cuon': 'gỏi cuốn spring rolls',
  'nem-ran': 'fried spring rolls vietnamese',
  'pho-bo': 'phở bò beef noodle soup',
  'bun-cha': 'bún chả hanoi',
  'com-tam': 'cơm tấm sườn',
  'caphe-sua-da': 'cà phê sữa đá',
  'tra-sen': 'lotus tea drink',
  'che-ba-mau': 'chè ba màu thái',
  'banh-mi-thit-nguoi': 'bánh mì thịt nguội',
  'banh-mi-ga': 'bánh mì gà',
  'banh-mi-dac-biet': 'bánh mì ốp la',
  'banh-bong-lan': 'sponge cake',
  'panna-cotta': 'panna cotta dessert glass',
  'caphe-den': 'black coffee cup',
  'tra-sua': 'trà sữa trân châu',
  'sinh-to-bo': 'sinh tố bơ',
  'pho-ga': 'phở gà',
  'bun-dau': 'bún đậu mắm tôm',
  'xoi-xeo': 'xôi xéo',
  'banh-mi-op-la': 'bánh mì ốp la',
  'sua-dau-nanh': 'sữa đậu nành',
  'combo-ga-ran': 'fried chicken rice meal',
  'combo-com-ga': 'cơm gà xối mỡ',
  'ga-ran': 'fried chicken crispy',
  'khoai-tay': 'khoai tây chiên',
  'che-buoi': 'chè bưởi',
  'sua-chua-nep-cam': 'sữa chua nếp cẩm',
};

type OpenverseResult = {
  title?: string;
  license?: string;
  url?: string;
  width?: number;
  height?: number;
};

async function searchImages(query: string): Promise<OpenverseResult[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrnamespace: '6',
    gsrsearch: query,
    gsrlimit: '15',
    prop: 'imageinfo',
    iiprop: 'url|size|mime',
    iiurlwidth: '800',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
  if (!res.ok) {
    throw new Error(`Wikimedia ${res.status}`);
  }
  const data = (await res.json()) as {
    query?: { pages?: Record<string, PageWithImageInfo> };
  };
  const pages = Object.values(data.query?.pages ?? {});
  const results = pages
    .filter((p) => (p.imageinfo?.[0]?.width ?? 0) >= 640)
    .filter((p) => /^image\/(jpeg|png|webp)$/i.test(p.imageinfo?.[0]?.mime ?? ''))
    .map((p) => {
      const ii = p.imageinfo?.[0];
      return {
        title: p.title,
        url: ii?.thumburl ?? ii?.url,
        width: ii?.width,
        height: ii?.height,
      };
    });
  return results;
}

type PageWithImageInfo = OpenverseResult & {
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    width?: number;
    height?: number;
    mime?: string;
  }>;
};

function isDirectUrl(url: string): boolean {
  try {
    const host = new URL(url).host;
    return host.includes('upload.wikimedia.org') || host.includes('static.wikimedia.org');
  } catch {
    return false;
  }
}

function pickBest(results: OpenverseResult[]): OpenverseResult | null {
  const candidates = results.filter(
    (r) => r.url && isDirectUrl(r.url) && (r.width ?? 0) >= 600 && (r.width ?? 0) <= 6000,
  );
  candidates.sort((a, b) => {
    const aRatio = a.width! / Math.max(a.height ?? 1, 1);
    const bRatio = b.width! / Math.max(b.height ?? 1, 1);
    return Math.abs(aRatio - 1.5) - Math.abs(bRatio - 1.5);
  });
  return candidates[0] ?? null;
}

async function download(url: string, dest: string) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`下载失败 ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
}

function compressToJpg(src: string, dest: string) {
  execFileSync(
    'sips',
    ['-Z', '600', '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', src, '--out', dest],
    {
      stdio: 'pipe',
    },
  );
}

async function searchImagesWithRetry(query: string): Promise<OpenverseResult[]> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await searchImages(query);
    } catch (err) {
      const msg = (err as Error).message;
      if (/429/.test(msg) && attempt < 3) {
        const wait = 2000 * 2 ** attempt;
        console.log(`  429 限流，${wait / 1000}s 后重试…`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
  return [];
}

async function main() {
  const slugs = Object.values(manifest.stores).flatMap((s) => Object.keys(s.imageKeys));
  const unique = [...new Set(slugs)];
  console.log(`共 ${unique.length} 个菜品图需要下载`);

  for (const slug of unique) {
    const query = QUERIES[slug] ?? slug;
    const rawPath = path.join(OUT_DIR, `${slug}.orig`);
    const outPath = path.join(OUT_DIR, `${slug}.jpg`);
    try {
      if (readFileSync(outPath).length > 0) {
        console.log(`skip ${slug}（已存在）`);
        continue;
      }
    } catch {
      // 不存在则下载
    }
    try {
      const results = await searchImagesWithRetry(query);
      const best = pickBest(results);
      if (!best?.url) {
        console.warn(`✗ ${slug}: 无合适图片 (q="${query}")`);
        continue;
      }
      await download(best.url, rawPath);
      compressToJpg(rawPath, outPath);
      console.log(`✓ ${slug} ← ${best.title ?? best.url}`);
    } catch (err) {
      console.error(`✗ ${slug}: ${(err as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.log('\n完成。目录:', OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
