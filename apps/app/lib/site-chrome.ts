/**
 * 根布局的页眉/页脚形态：
 * - workspace：商家后台与员工终端，自带外壳，不显示站点页眉页脚
 * - customer：顾客点单页（/m/*），只保留一行「Powered by TaoMenu」，不显示登录等产品入口（issue #20）
 * - full：登录等其他公开页
 */
export type SiteChrome = 'workspace' | 'customer' | 'full';

export function getSiteChrome(pathname: string): SiteChrome {
  if (/^\/(app|terminal)(\/|$)/.test(pathname)) return 'workspace';
  if (/^\/m(\/|$)/.test(pathname)) return 'customer';
  return 'full';
}

/** 顾客页底部「Powered by」链接，带来源参数便于统计获客 */
export function getPoweredByUrl(websiteUrl: string): string {
  const url = new URL(websiteUrl);
  url.searchParams.set('utm_source', 'menu');
  url.searchParams.set('utm_medium', 'powered_by');
  return url.toString();
}
