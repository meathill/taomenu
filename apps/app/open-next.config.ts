import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// PWA 业务应用；D1/R2 等 binding 在后续阶段接入。
// issue #11：显式关闭 cache interception，避免 Next 16.3 _rsc prefetch 放大跑量。
export default defineCloudflareConfig({
  enableCacheInterception: false,
});
