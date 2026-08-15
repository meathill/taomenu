import { getCloudflareContext } from '@opennextjs/cloudflare';

/** 取 Cloudflare 运行时绑定。仅在请求上下文中调用。 */
export function getEnv(): CloudflareEnv {
  return getCloudflareContext().env as CloudflareEnv;
}

/** Auth 热路径用 async，避免同步 ALS 在部分 OpenNext 上下文里拿不到 binding。 */
export async function getEnvAsync(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env as CloudflareEnv;
}
