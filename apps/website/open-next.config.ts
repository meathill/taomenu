import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// 营销站以 SSR/SSG 为主，MVP 暂不接 R2 incremental cache。
export default defineCloudflareConfig();
