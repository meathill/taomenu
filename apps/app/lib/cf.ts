import { getCloudflareContext } from '@opennextjs/cloudflare';

/** 取 Cloudflare 运行时绑定。仅在请求上下文中调用。 */
export function getEnv(): CloudflareEnv {
  return getCloudflareContext().env as CloudflareEnv;
}
