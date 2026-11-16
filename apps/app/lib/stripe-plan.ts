import type { PlanId } from '@taomenu/shared';
import type { StripeConfig } from './stripe';

/** Checkout / 订阅 metadata.kind */
export type PlanCheckoutKind = 'pro_plan' | 'pro_plus_plan';

export function listConfiguredPriceIds(...ids: Array<string | undefined>): string[] {
  return ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

export function listProPriceIds(config: StripeConfig): string[] {
  return listConfiguredPriceIds(config.proPriceId, config.proAnnualPriceId);
}

/** 含早鸟价：webhook 必须把所有 Pro+ Price 都映射到 pro_plus，避免促销价漏记权益 */
export function listProPlusPriceIds(config: StripeConfig): string[] {
  return listConfiguredPriceIds(
    config.proPlusPriceId,
    config.proPlusAnnualPriceId,
    config.proPlusPromoPriceId,
    config.proPlusAnnualPromoPriceId,
  );
}

/**
 * 用 Price ID 优先、metadata.kind 兜底，把 Stripe 对象映射到套餐。
 * Price ID 优先是为了：即便 kind 写错，只要买的是 Pro+ 价就授予 Pro+。
 */
export function resolvePlanFromStripe(input: {
  config: StripeConfig;
  kind?: string | null;
  priceId?: string | null;
}): PlanId | null {
  const priceId = input.priceId ?? '';
  if (priceId && listProPlusPriceIds(input.config).includes(priceId)) return 'pro_plus';
  if (input.kind === 'pro_plus_plan') return 'pro_plus';
  if (priceId && listProPriceIds(input.config).includes(priceId)) return 'pro';
  if (input.kind === 'pro_plan') return 'pro';
  return null;
}

export function planCheckoutKind(plan: 'pro' | 'pro_plus'): PlanCheckoutKind {
  return plan === 'pro_plus' ? 'pro_plus_plan' : 'pro_plan';
}
