/**
 * 把 dish-images 目录的图片按 manifest 上传到本地 R2。
 * 用法：在 apps/app 下 `pnpm exec tsx scripts/upload-dish-images.ts`
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const manifest = JSON.parse(
  readFileSync(path.join(__dirname, 'demo-stores.manifest.json'), 'utf8'),
) as { stores: Record<string, { imageKeys: Record<string, string> }> };

function run(args: string[]) {
  execFileSync('pnpm', ['exec', 'wrangler', ...args], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'pipe',
  });
}

async function main() {
  const jobs: Array<{ slug: string; key: string; file: string }> = [];
  for (const store of Object.values(manifest.stores)) {
    for (const [slug, key] of Object.entries(store.imageKeys)) {
      jobs.push({ slug, key, file: path.join(__dirname, 'dish-images', `${slug}.jpg`) });
    }
  }
  console.log(`共 ${jobs.length} 个对象待上传`);

  for (const job of jobs) {
    try {
      run([
        'r2',
        'object',
        'put',
        `taomenu-media/${job.key}`,
        '--file',
        job.file,
        '--local',
        '--persist-to',
        '.wrangler/state',
        '--content-type',
        'image/jpeg',
      ]);
      console.log(`✓ ${job.slug} → ${job.key}`);
    } catch (err) {
      console.error(`✗ ${job.slug}: ${(err as Error).message.split('\n').slice(-2).join(' ')}`);
    }
  }
  console.log('\n完成');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
