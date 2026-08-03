/**
 * 公开站点 URL：只读 process.env（含 NEXT_PUBLIC_*），不经 getCloudflareContext。
 * 部署前 / 构建时必须注入真实 URL；本地默认 localhost。
 */

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function readPublicUrl(
  name: 'NEXT_PUBLIC_APP_URL' | 'NEXT_PUBLIC_WEBSITE_URL',
  fallback: string,
): string {
  const raw = process.env[name];
  if (!raw || raw.trim() === '') {
    return fallback;
  }
  return stripTrailingSlash(raw.trim());
}

/** 产品面 app 绝对 URL（无尾斜杠） */
export function getPublicAppUrl(): string {
  return readPublicUrl('NEXT_PUBLIC_APP_URL', 'http://localhost:3001');
}

/** 营销站绝对 URL（无尾斜杠） */
export function getPublicWebsiteUrl(): string {
  return readPublicUrl('NEXT_PUBLIC_WEBSITE_URL', 'http://localhost:3000');
}

/**
 * Better Auth baseURL。
 * 优先 BETTER_AUTH_URL，否则 NEXT_PUBLIC_APP_URL；均只读 process.env。
 */
export function getAuthBaseUrl(): string {
  const raw = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!raw || raw.trim() === '') {
    return 'http://localhost:3001';
  }
  return stripTrailingSlash(raw.trim());
}

export function joinPublicUrl(base: string, path: string): string {
  const normalizedBase = stripTrailingSlash(base);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}
