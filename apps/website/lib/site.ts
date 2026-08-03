/**
 * 公开站点 URL：只读 process.env.NEXT_PUBLIC_*，不经 getCloudflareContext。
 * 构建 / 部署时注入真实 URL；本地默认 localhost。
 * 用函数而非模块常量，避免在 env 注入前被一次性固化。
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

export function getPublicWebsiteUrl(): string {
  return readPublicUrl('NEXT_PUBLIC_WEBSITE_URL', 'http://localhost:3000');
}

export function getPublicAppUrl(): string {
  return readPublicUrl('NEXT_PUBLIC_APP_URL', 'http://localhost:3001');
}

export function getAppLoginUrl(): string {
  return `${getPublicAppUrl()}/login`;
}

export function getAppSignupUrl(): string {
  return `${getPublicAppUrl()}/login`;
}
