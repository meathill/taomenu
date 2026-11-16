import { describe, expect, it } from 'vitest';
import type { StripeConfig } from './stripe';
import { listProPlusPriceIds, resolvePlanFromStripe } from './stripe-plan';

const config: StripeConfig = {
  secretKey: 'sk_test',
  webhookSecret: 'whsec_test',
  proPriceId: 'price_pro_month',
  proAnnualPriceId: 'price_pro_year',
  proPlusPriceId: 'price_plus_month',
  proPlusAnnualPriceId: 'price_plus_year',
  proPlusPromoPriceId: 'price_plus_promo_month',
  proPlusAnnualPromoPriceId: 'price_plus_promo_year',
};

describe('resolvePlanFromStripe', () => {
  it('按 Price ID 把四个 Pro+ 价（含早鸟）映射为 pro_plus', () => {
    for (const priceId of listProPlusPriceIds(config)) {
      expect(resolvePlanFromStripe({ config, kind: 'pro_plan', priceId })).toBe('pro_plus');
    }
  });

  it('Pro 价映射为 pro', () => {
    expect(resolvePlanFromStripe({ config, kind: 'pro_plan', priceId: 'price_pro_year' })).toBe(
      'pro',
    );
    expect(resolvePlanFromStripe({ config, kind: 'pro_plan', priceId: null })).toBe('pro');
  });

  it('kind 为 pro_plus_plan 时即使没有 priceId 也授予 Pro+', () => {
    expect(resolvePlanFromStripe({ config, kind: 'pro_plus_plan', priceId: null })).toBe(
      'pro_plus',
    );
  });

  it('无法识别时返回 null', () => {
    expect(
      resolvePlanFromStripe({ config, kind: 'staff_seats', priceId: 'price_other' }),
    ).toBeNull();
  });
});
