import { describe, expect, it } from 'vitest';
import { getPublicAppUrl } from './public-url';
import {
  buildProCheckoutParams,
  buildStaffSeatCheckoutParams,
  getProCheckoutPriceId,
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
