import { withStore } from '@/lib/active-store-utils';

/** 会触发付费墙的 Pro 功能；每个功能在 owner.paywall* 里有一段说明 */
export const PAYWALL_FEATURES = [
  'removePoweredBy',
  'translation',
  'photoEnhance',
  'qrTemplates',
  'menuImport',
  'aiTools',
] as const;

export type PaywallFeature = (typeof PAYWALL_FEATURES)[number];

/** 付费墙里「查看套餐对比」：设置页的升级区块 */
export function getUpgradeSettingsHref(storeSlug: string): string {
  return `${withStore('/app/settings?upgrade=pro', storeSlug)}#upgrade`;
}
