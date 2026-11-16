import { describe, expect, it } from 'vitest';
import { getPublicAppUrl } from './public-url';
import {
  buildProCheckoutParams,
  buildStaffSeatCheckoutParams,
  getChristmasProCheckoutOffers,
  getProCheckoutPriceId,
  getProPlusCheckoutPriceId,
  isSubscriptionUsable,
  toStripeCheckoutLocale,
  verifyStripeWebhookSignature,
} from './stripe';

async function signature(payload: string, secret: string, timestamp: number): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

describe('Stripe webhook signature verification', () => {
  it('accepts a current valid v1 signature', async () => {
    const payload = '{"type":"checkout.session.completed"}';
    const secret = 'whsec_test';
    const timestamp = 1_754_455_200;
    const digest = await signature(payload, secret, timestamp);

    await expect(
      verifyStripeWebhookSignature(payload, `t=${timestamp},v1=${digest}`, secret, timestamp),
    ).resolves.toBe(true);
  });

  it('rejects a tampered payload', async () => {
    const secret = 'whsec_test';
    const timestamp = 1_754_455_200;
    const digest = await signature('original', secret, timestamp);

    await expect(
      verifyStripeWebhookSignature('tampered', `t=${timestamp},v1=${digest}`, secret, timestamp),
    ).resolves.toBe(false);
  });

  it('rejects an expired timestamp', async () => {
    const payload = 'payload';
    const secret = 'whsec_test';
    const timestamp = 1_754_455_200;
    const digest = await signature(payload, secret, timestamp);

    await expect(
      verifyStripeWebhookSignature(payload, `t=${timestamp},v1=${digest}`, secret, timestamp + 301),
    ).resolves.toBe(false);
  });
});

describe('Stripe Checkout 参数构造', () => {
  const baseInput = {
    priceId: 'price_pro_multi',
    storeId: 'store_1',
    storeSlug: 'pho-hanoi',
    ownerEmail: 'owner@example.com',
    stripeCustomerId: null,
    currency: 'USD',
    locale: 'en',
  };
  const appUrl = getPublicAppUrl();

  it('Pro：按门店币种结算并带上订阅元数据', () => {
    const params = buildProCheckoutParams({ ...baseInput, stripeCustomerId: 'cus_123' });

    expect(params.get('mode')).toBe('subscription');
    expect(params.get('currency')).toBe('usd');
    expect(params.get('locale')).toBe('en');
    expect(params.get('line_items[0][price]')).toBe('price_pro_multi');
    expect(params.get('line_items[0][quantity]')).toBe('1');
    expect(params.get('client_reference_id')).toBe('store_1');
    expect(params.get('metadata[storeId]')).toBe('store_1');
    expect(params.get('metadata[kind]')).toBe('pro_plan');
    expect(params.get('subscription_data[metadata][storeId]')).toBe('store_1');
    expect(params.get('subscription_data[metadata][kind]')).toBe('pro_plan');
    expect(params.get('success_url')).toBe(
      `${appUrl}/app/settings?store=pho-hanoi&billing=success`,
    );
    expect(params.get('cancel_url')).toBe(`${appUrl}/app/settings?store=pho-hanoi&billing=cancel`);
    expect(params.get('customer')).toBe('cus_123');
    expect(params.get('customer_email')).toBeNull();
  });

  it('Pro+：kind 与成功回跳带 plan=pro-plus（Stripe 不允许 URL 片段）', () => {
    const params = buildProCheckoutParams({
      ...baseInput,
      priceId: 'price_plus_year',
      interval: 'year',
      kind: 'pro_plus_plan',
    });
    expect(params.get('metadata[kind]')).toBe('pro_plus_plan');
    expect(params.get('metadata[priceId]')).toBe('price_plus_year');
    expect(params.get('subscription_data[metadata][kind]')).toBe('pro_plus_plan');
    expect(params.get('success_url')).toContain('plan=pro-plus');
    expect(params.get('success_url')).not.toContain('#');
    expect(params.get('success_url')).toBe(
      `${appUrl}/app/settings?store=pho-hanoi&billing=success&plan=pro-plus`,
    );
  });

  it('Pro：年付写入 interval 元数据，默认月付', () => {
    const yearly = buildProCheckoutParams({ ...baseInput, interval: 'year' });
    expect(yearly.get('metadata[interval]')).toBe('year');
    expect(yearly.get('subscription_data[metadata][interval]')).toBe('year');

    const monthly = buildProCheckoutParams(baseInput);
    expect(monthly.get('metadata[interval]')).toBe('month');
  });

  it('Pro：没有 Stripe 客户时回落到 customer_email', () => {
    const params = buildProCheckoutParams(baseInput);

    expect(params.get('customer')).toBeNull();
    expect(params.get('customer_email')).toBe('owner@example.com');
  });

  it('席位：数量与币种进入结算参数', () => {
    const params = buildStaffSeatCheckoutParams({
      ...baseInput,
      priceId: 'price_seat_multi',
      quantity: 3,
    });

    expect(params.get('mode')).toBe('subscription');
    expect(params.get('currency')).toBe('usd');
    expect(params.get('locale')).toBe('en');
    expect(params.get('line_items[0][price]')).toBe('price_seat_multi');
    expect(params.get('line_items[0][quantity]')).toBe('3');
    expect(params.get('metadata[storeId]')).toBe('store_1');
    expect(params.get('metadata[kind]')).toBe('staff_seats');
    expect(params.get('metadata[staffSeatQuantity]')).toBe('3');
    expect(params.get('subscription_data[metadata][kind]')).toBe('staff_seats');
    expect(params.get('subscription_data[metadata][staffSeatQuantity]')).toBe('3');
    expect(params.get('success_url')).toBe(`${appUrl}/app/staff?store=pho-hanoi&billing=success`);
    expect(params.get('cancel_url')).toBe(`${appUrl}/app/staff?store=pho-hanoi&billing=cancel`);
    expect(params.get('customer_email')).toBe('owner@example.com');
  });

  it('席位：有 Stripe 客户时使用 customer', () => {
    const params = buildStaffSeatCheckoutParams({
      ...baseInput,
      priceId: 'price_seat_multi',
      quantity: 1,
      stripeCustomerId: 'cus_456',
    });

    expect(params.get('customer')).toBe('cus_456');
    expect(params.get('customer_email')).toBeNull();
  });

  it.each([
    ['pro', () => buildProCheckoutParams(baseInput)],
    ['seat', () => buildStaffSeatCheckoutParams({ ...baseInput, quantity: 1 })],
  ] as const)('%s 不写死 payment_method_types，交给 Stripe 按币种协商', (_name, build) => {
    expect(build().has('payment_method_types[0]')).toBe(false);
    expect(build().has('payment_method_types')).toBe(false);
  });
});

describe('Stripe subscription entitlement', () => {
  it.each(['active', 'trialing', 'past_due'])('%s 暂时保留已购买权益', (status) => {
    expect(isSubscriptionUsable(status)).toBe(true);
  });

  it.each(['incomplete', 'unpaid', 'canceled', null])('%s 不授予 Pro 权益', (status) => {
    expect(isSubscriptionUsable(status)).toBe(false);
  });
});

describe('toStripeCheckoutLocale', () => {
  it('maps the four owner UI languages to Stripe locale codes', () => {
    expect(toStripeCheckoutLocale('vi')).toBe('vi');
    expect(toStripeCheckoutLocale('ja')).toBe('ja');
    expect(toStripeCheckoutLocale('zh')).toBe('zh');
    expect(toStripeCheckoutLocale('en')).toBe('en');
  });

  it('falls back to English for unknown values', () => {
    expect(toStripeCheckoutLocale('fr')).toBe('en');
    expect(toStripeCheckoutLocale(undefined)).toBe('en');
  });
});

describe('Checkout locale and currency together', () => {
  it('Vietnamese owner paying VND still gets locale=vi and currency=vnd', () => {
    const params = buildProCheckoutParams({
      priceId: 'price_pro_multi',
      storeId: 'store_1',
      storeSlug: 'qa-pho-chi-mai-hoi-an',
      ownerEmail: 'owner@example.com',
      stripeCustomerId: null,
      currency: 'VND',
      locale: 'vi',
    });
    expect(params.get('locale')).toBe('vi');
    expect(params.get('currency')).toBe('vnd');
  });
});

describe('getProCheckoutPriceId', () => {
  const config = {
    secretKey: 'sk_test',
    webhookSecret: 'whsec_test',
    proPriceId: 'price_month',
    proAnnualPriceId: 'price_year',
  };

  it('按周期选择月付或年付 Price', () => {
    expect(getProCheckoutPriceId(config, 'month')).toBe('price_month');
    expect(getProCheckoutPriceId(config, 'year')).toBe('price_year');
  });

  it('年付 Price 未配置时返回 undefined，让路由返回未开通结算', () => {
    expect(
      getProCheckoutPriceId({ ...config, proAnnualPriceId: undefined }, 'year'),
    ).toBeUndefined();
  });
});

describe('圣诞促销 Checkout 参数', () => {
  const config = {
    secretKey: 'sk_test',
    webhookSecret: 'whsec_test',
    proPriceId: 'price_pro_month',
    proAnnualPriceId: 'price_pro_year',
    promoProAnnualCouponId: 'r3D3HF5U',
    proPlusPriceId: 'price_plus_month',
    proPlusAnnualPriceId: 'price_plus_year',
    proPlusPromoPriceId: 'price_plus_promo_month',
    proPlusAnnualPromoPriceId: 'price_plus_promo_year',
  };

  it('窗口内：月付只有 trial，没有优惠券', () => {
    const offers = getChristmasProCheckoutOffers(
      config,
      'month',
      new Date('2026-12-25T10:00:00+07:00'),
    );
    expect(offers).toEqual({ trialPeriodDays: 30 });
    const params = buildProCheckoutParams({
      priceId: 'price_pro_month',
      storeId: 'store_1',
      storeSlug: 'pho-hanoi',
      ownerEmail: 'owner@example.com',
      stripeCustomerId: null,
      currency: 'VND',
      locale: 'vi',
      interval: 'month',
      ...offers,
    });
    expect(params.get('subscription_data[trial_period_days]')).toBe('30');
    expect(params.get('discounts[0][coupon]')).toBeNull();
  });

  it('窗口内：年付只有优惠券，没有 trial', () => {
    const offers = getChristmasProCheckoutOffers(
      config,
      'year',
      new Date('2026-12-25T10:00:00+07:00'),
    );
    expect(offers).toEqual({ couponId: 'r3D3HF5U' });
    const params = buildProCheckoutParams({
      priceId: 'price_pro_year',
      storeId: 'store_1',
      storeSlug: 'pho-hanoi',
      ownerEmail: 'owner@example.com',
      stripeCustomerId: null,
      currency: 'VND',
      locale: 'vi',
      interval: 'year',
      ...offers,
    });
    expect(params.get('discounts[0][coupon]')).toBe('r3D3HF5U');
    expect(params.get('subscription_data[trial_period_days]')).toBeNull();
  });

  it('窗口结束后不再附带任何圣诞优惠', () => {
    expect(
      getChristmasProCheckoutOffers(config, 'month', new Date('2026-12-26T00:00:00+07:00')),
    ).toEqual({});
    expect(
      getChristmasProCheckoutOffers(config, 'year', new Date('2026-12-26T00:00:00+07:00')),
    ).toEqual({});
  });

  it('早鸟期内 Pro+ 使用促销 Price，圣诞优惠不会写进 Pro+ Checkout', () => {
    expect(getProPlusCheckoutPriceId(config, 'month', new Date('2027-02-16T10:00:00+07:00'))).toBe(
      'price_plus_promo_month',
    );
    expect(getProPlusCheckoutPriceId(config, 'year', new Date('2027-02-16T10:00:00+07:00'))).toBe(
      'price_plus_promo_year',
    );
    const params = buildProCheckoutParams({
      priceId: 'price_plus_promo_year',
      storeId: 'store_1',
      storeSlug: 'pho-hanoi',
      ownerEmail: 'owner@example.com',
      stripeCustomerId: null,
      currency: 'VND',
      locale: 'vi',
      interval: 'year',
      kind: 'pro_plus_plan',
    });
    expect(params.get('discounts[0][coupon]')).toBeNull();
    expect(params.get('subscription_data[trial_period_days]')).toBeNull();
  });

  it('早鸟结束后 Pro+ 回到标价', () => {
    expect(getProPlusCheckoutPriceId(config, 'month', new Date('2027-02-17T00:00:00+07:00'))).toBe(
      'price_plus_month',
    );
  });
});

describe('Pro+ Checkout 参数矩阵', () => {
  const config = {
    secretKey: 'sk_test',
    webhookSecret: 'whsec_test',
    proPlusPriceId: 'price_plus_month',
    proPlusAnnualPriceId: 'price_plus_year',
    proPlusPromoPriceId: 'price_plus_promo_month',
    proPlusAnnualPromoPriceId: 'price_plus_promo_year',
  };
  const appUrl = getPublicAppUrl();
  const cases = [
    {
      name: '早鸟期内月付',
      interval: 'month' as const,
      now: new Date('2027-02-16T10:00:00+07:00'),
      priceId: 'price_plus_promo_month',
    },
    {
      name: '早鸟期内年付',
      interval: 'year' as const,
      now: new Date('2027-02-16T10:00:00+07:00'),
      priceId: 'price_plus_promo_year',
    },
    {
      name: '早鸟结束后月付',
      interval: 'month' as const,
      now: new Date('2027-02-17T00:00:00+07:00'),
      priceId: 'price_plus_month',
    },
    {
      name: '早鸟结束后年付',
      interval: 'year' as const,
      now: new Date('2027-02-17T00:00:00+07:00'),
      priceId: 'price_plus_year',
    },
  ];

  for (const testCase of cases) {
    it(`${testCase.name}：选对 Price，成功回跳无片段，且不带圣诞优惠`, () => {
      expect(getProPlusCheckoutPriceId(config, testCase.interval, testCase.now)).toBe(
        testCase.priceId,
      );
      const params = buildProCheckoutParams({
        priceId: testCase.priceId,
        storeId: 'store_1',
        storeSlug: 'pho-hanoi',
        ownerEmail: 'owner@example.com',
        stripeCustomerId: null,
        currency: 'VND',
        locale: 'vi',
        interval: testCase.interval,
        kind: 'pro_plus_plan',
      });
      expect(params.get('mode')).toBe('subscription');
      expect(params.get('currency')).toBe('vnd');
      expect(params.get('locale')).toBe('vi');
      expect(params.get('line_items[0][price]')).toBe(testCase.priceId);
      expect(params.get('line_items[0][quantity]')).toBe('1');
      expect(params.get('client_reference_id')).toBe('store_1');
      expect(params.get('customer_email')).toBe('owner@example.com');
      expect(params.get('metadata[kind]')).toBe('pro_plus_plan');
      expect(params.get('metadata[interval]')).toBe(testCase.interval);
      expect(params.get('metadata[priceId]')).toBe(testCase.priceId);
      expect(params.get('subscription_data[metadata][kind]')).toBe('pro_plus_plan');
      expect(params.get('success_url')).toBe(
        `${appUrl}/app/settings?store=pho-hanoi&billing=success&plan=pro-plus`,
      );
      expect(params.get('cancel_url')).toBe(
        `${appUrl}/app/settings?store=pho-hanoi&billing=cancel`,
      );
      expect(params.get('success_url')).not.toContain('#');
      expect(params.get('cancel_url')).not.toContain('#');
      expect(params.get('discounts[0][coupon]')).toBeNull();
      expect(params.get('subscription_data[trial_period_days]')).toBeNull();
    });
  }
});
