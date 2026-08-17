/**
 * 定向修复菜品图：对已知不合适的 slug 重新搜索，按标题关键词过滤后下载。
 * 用法：`pnpm exec tsx scripts/fix-dish-images.ts`
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'dish-images');

type FixSpec = {
  slug: string;
  queries: string[];
  mustMatch: RegExp;
  avoid?: RegExp;
};

const FIXES: FixSpec[] = [
  {
    slug: 'tra-sen',
    queries: ['trà sen', 'lotus tea'],
    mustMatch: /trà|tea|lotus|sen/i,
    avoid: /kop|vakdecoratie|antiek/i,
  },
  {
    slug: 'che-ba-mau',
    queries: ['chè ba màu', 'chè thái', 'chè', 'Vietnamese dessert drink'],
    mustMatch: /chè|dessert|pudding|bean drink|sương sáo/i,
    avoid: /UBND|xã|building|office/i,
  },
  {
    slug: 'banh-mi-ga',
    queries: ['bánh mì gà', 'gà xé phay', 'bánh mì'],
    mustMatch: /bánh mì|banh mi|sandwich|baguette/i,
    avoid: /sup|soup|chicken noodle/i,
  },
  {
    slug: 'sinh-to-bo',
    queries: ['sinh tố bơ', 'avocado smoothie', 'smoothie'],
    mustMatch: /smoothie|sinh tố|avocado/i,
  },
  {
    slug: 'xoi-xeo',
    queries: ['xôi xéo', 'xôi', 'sticky rice mung bean'],
    mustMatch: /xôi|sticky rice|mung bean/i,
    avoid: /raspberr/i,
  },
  {
    slug: 'khoai-tay',
    queries: ['french fries plate', 'khoai tây chiên', 'french fries'],
    mustMatch: /fries|frites|khoai tây|chips/i,
    avoid: /vending/i,
  },
  {
    slug: 'che-buoi',
    queries: ['chè bưởi', 'pomelo dessert', 'chè thái'],
    mustMatch: /chè|pomelo|dessert/i,
    avoid: /bắp|corn/i,
  },
  {
    slug: 'sua-chua-nep-cam',
    queries: ['sữa chua nếp cẩm', 'black sticky rice', 'nếp cẩm', 'yogurt sticky rice'],
    mustMatch: /nếp cẩm|sticky rice|yogurt|sữa chua/i,
    avoid: /UBND|xã/i,
  },
  {
    slug: 'combo-com-ga',
    queries: ['cơm gà xối mỡ', 'cơm gà', 'roast chicken rice vietnam'],
    mustMatch: /cơm gà|chicken rice|gà xối|roast chicken/i,
  },
  { slug: 'pho-ga', queries: ['phở gà', 'chicken pho'], mustMatch: /phở|pho|chicken noodle/i },
  {
    slug: 'tra-sua',
    queries: ['trà sữa trân châu', 'trà sữa', 'bubble tea cup'],
    mustMatch: /trà sữa|bubble tea|milk tea|tapioca|pearls/i,
    avoid: /shop|store/i,
  },
];

type Page = {
  title?: string;
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    width?: number;
    height?: number;
    mime?: string;
  }>;
};

async function search(query: string): Promise<Page[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrnamespace: '6',
    gsrsearch: query,
    gsrlimit: '20',
    prop: 'imageinfo',
    iiprop: 'url|size|mime',
    iiurlwidth: '800',
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
  if (!res.ok) throw new Error(`Wikimedia ${res.status}`);
  const data = (await res.json()) as { query?: { pages?: Record<string, Page> } };
  return Object.values(data.query?.pages ?? {});
}

function pick(pages: Page[], spec: FixSpec): Page | null {
  const candidates = pages.filter((p) => {
    const ii = p.imageinfo?.[0];
    if (!ii || !ii.thumburl) return false;
    if (!/^image\/(jpeg|png|webp)$/i.test(ii.mime ?? '')) return false;
    if ((ii.width ?? 0) < 600) return false;
    if (spec.avoid?.test(p.title ?? '')) return false;
    return spec.mustMatch.test(p.title ?? '');
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const ar = (a.imageinfo?.[0]?.width ?? 0) / Math.max(a.imageinfo?.[0]?.height ?? 1, 1);
    const br = (b.imageinfo?.[0]?.width ?? 0) / Math.max(b.imageinfo?.[0]?.height ?? 1, 1);
    return Math.abs(ar - 1.4) - Math.abs(br - 1.4);
  });
  return candidates[0] ?? null;
}

async function download(url: string, dest: string) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`下载失败 ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  for (const spec of FIXES) {
    const outPath = path.join(OUT_DIR, `${spec.slug}.jpg`);
    const rawPath = path.join(OUT_DIR, `${spec.slug}.orig`);
    let chosen: Page | null = null;
    for (const q of spec.queries) {
      try {
        const pages = await search(q);
        const hit = pick(pages, spec);
        if (hit) {
          chosen = hit;
          break;
        }
      } catch (err) {
        console.warn(`  ${spec.slug} query "${q}" 失败: ${(err as Error).message}`);
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
    if (!chosen) {
      console.warn(`✗ ${spec.slug}: 所有 query 都未命中`);
      continue;
    }
    const url = chosen.imageinfo?.[0]?.thumburl ?? chosen.imageinfo?.[0]?.url;
    if (!url) {
      console.warn(`✗ ${spec.slug}: 无 url`);
      continue;
    }
    await download(url, rawPath);
    execFileSync(
      'sips',
      ['-Z', '600', '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', rawPath, '--out', outPath],
      { stdio: 'pipe' },
    );
    console.log(`✓ ${spec.slug} ← ${chosen.title} (${url.split('/').pop()})`);
    await new Promise((r) => setTimeout(r, 1200));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
