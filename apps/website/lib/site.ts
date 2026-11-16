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

/** 注册入口：同一个登录页，但带 intent=signup 显示「创建免费门店」文案（issue #24） */
export function getAppSignupUrl(): string {
  return `${getPublicAppUrl()}/login?intent=signup`;
}

/** 店内升级 Pro 的落点：settings 会高亮升级区块，没有门店时先走建店再回来 */
export const PRO_UPGRADE_PATH = '/app/settings?upgrade=pro';

/** 定价页 Pro 卡片：登录 / 注册后直接进入升级入口（issue #16） */
export function getAppProSignupUrl(): string {
  const url = new URL(getAppSignupUrl());
  url.searchParams.set('next', PRO_UPGRADE_PATH);
  return url.toString();
}

/** Public pickup menu used as the marketing live demo (QA store, presentable display name). */
const DEMO_PICKUP_PATH = '/m/qa-pho-chi-mai-hoi-an/p/j3q_KRyu-tVFlvFT3poG0piyCzMaHMcv';

export function getDemoMenuUrl(): string {
  return `${getPublicAppUrl()}${DEMO_PICKUP_PATH}`;
}

/** 定价页 Pro+ 卡片：登录后进入设置页并滚到 Pro+ 升级区 */
export const PRO_PLUS_UPGRADE_PATH = '/app/settings?upgrade=pro-plus';

export function getAppProPlusSignupUrl(): string {
  const url = new URL(getAppSignupUrl());
  url.searchParams.set('next', PRO_PLUS_UPGRADE_PATH);
  return url.toString();
}
