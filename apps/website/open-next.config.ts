import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache';

// 营销站为纯 SSG（全部 force-static），按官方 SSG 指南：
// 用只读的 Workers Static Assets 增量缓存提供预渲染页，命中路由不启动 NextServer。
// 不用 R2/DO/D1：本站无 ISR、无 revalidateTag/revalidatePath、无 D1。
// issue #11：关闭 cache interception，避免 Next 16.3 _rsc prefetch 放大跑量。
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: false,
});
