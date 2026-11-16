import { type BillingInterval, isLocale, type Locale } from '@taomenu/shared';
import { getEnv } from './cf';
import { getPublicAppUrl, joinPublicUrl } from './public-url';

/** Stripe Checkout 支持的语言码与产品 UI 四种语言一致。未知时回落 en，避免整页变成浏览器默认英文。 */
export function toStripeCheckoutLocale(locale: string | null | undefined): Locale {
  return isLocale(locale) ? locale : 'en';
}

const STRIPE_API_VERSION = '2026-04-22.dahlia';
const STRIPE_API_URL = 'https://api.stripe.com/v1';
const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

export type StripeConfig = {
  secretKey: string;
  webhookSecret: string;
  staffSeatPriceId?: string;
  proPriceId?: string;
  /** 年付 Pro Price ID；未配置时年付 Checkout 不可用。 */
  proAnnualPriceId?: string;
  proPlusPriceId?: string;
  proPlusAnnualPriceId?: string;
  proPlusPromoPriceId?: string;
  proPlusAnnualPromoPriceId?: string;
  promoProAnnualCouponId?: string;
};

export function getProCheckoutPriceId(
  config: StripeConfig,
  interval: BillingInterval,
): string | undefined {
  return interval === 'year' ? config.proAnnualPriceId : config.proPriceId;
}

/** 步骤 (b) 只走标价；早鸟价在步骤 (c) 的促销窗口内再选用。 */
export function getProPlusCheckoutPriceId(
  config: StripeConfig,
  interval: BillingInterval,
): string | undefined {
  return interval === 'year' ? config.proPlusAnnualPriceId : config.proPlusPriceId;
}

export function getStripeConfig(): StripeConfig | null {
  const env = getEnv();
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return null;
  }
  return {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    staffSeatPriceId: env.STRIPE_STAFF_SEAT_PRICE_ID,
    proPriceId: env.STRIPE_PRO_PRICE_ID,
    proAnnualPriceId: env.STRIPE_PRO_ANNUAL_PRICE_ID,
    proPlusPriceId: env.STRIPE_PRO_PLUS_PRICE_ID,
    proPlusAnnualPriceId: env.STRIPE_PRO_PLUS_ANNUAL_PRICE_ID,
    proPlusPromoPriceId: env.STRIPE_PRO_PLUS_PROMO_PRICE_ID,
    proPlusAnnualPromoPriceId: env.STRIPE_PRO_PLUS_ANNUAL_PROMO_PRICE_ID,
    promoProAnnualCouponId: env.STRIPE_PROMO_PRO_ANNUAL_COUPON_ID,
  };
}

type StripeResponse = {
  id?: string;
  url?: string;
  error?: { message?: string };
};

export class StripeRequestError extends Error {
  status: number;

  constructor(status: number) {
    super('Stripe request failed');
    this.name = 'StripeRequestError';
    this.status = status;
  }
}

async function stripeRequest(
  config: StripeConfig,
  path: string,
  params: URLSearchParams,
): Promise<StripeResponse> {
  const response = await fetch(`${STRIPE_API_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': STRIPE_API_VERSION,
    },
    body: params,
  });
  const data = (await response.json().catch(() => ({}))) as StripeResponse;
  if (!response.ok) {
    throw new StripeRequestError(response.status);
  }
  return data;
}

type CheckoutInputBase = {
  storeId: string;
  storeSlug: string;
  ownerEmail: string;
  stripeCustomerId: string | null;
  /** 门店计费币种，Stripe 侧由多币种 Price 的 currency_options 承接 */
  currency: string;
  /** 店主当前 UI 语言，传给 Checkout Session 的 locale */
  locale: string;
};

export type StaffSeatCheckoutInput = CheckoutInputBase & { quantity: number };

export type ProCheckoutInput = CheckoutInputBase & { interval?: BillingInterval };

function setCheckoutCustomer(params: URLSearchParams, input: CheckoutInputBase): void {
  if (input.stripeCustomerId) {
    params.set('customer', input.stripeCustomerId);
  } else {
    params.set('customer_email', input.ownerEmail);
  }
}

export function buildStaffSeatCheckoutParams(
  input: StaffSeatCheckoutInput & { priceId: string },
): URLSearchParams {
  const encodedStore = encodeURIComponent(input.storeSlug);
  const params = new URLSearchParams();
  params.set('mode', 'subscription');
  params.set('currency', input.currency.toLowerCase());
  params.set('locale', toStripeCheckoutLocale(input.locale));
  params.set('line_items[0][price]', input.priceId);
  params.set('line_items[0][quantity]', String(input.quantity));
  params.set('client_reference_id', input.storeId);
  params.set('metadata[storeId]', input.storeId);
  params.set('metadata[kind]', 'staff_seats');
  params.set('metadata[staffSeatQuantity]', String(input.quantity));
  params.set('subscription_data[metadata][storeId]', input.storeId);
  params.set('subscription_data[metadata][kind]', 'staff_seats');
  params.set('subscription_data[metadata][staffSeatQuantity]', String(input.quantity));
  params.set(
    'success_url',
    joinPublicUrl(getPublicAppUrl(), `/app/staff?store=${encodedStore}&billing=success`),
  );
  params.set(
    'cancel_url',
    joinPublicUrl(getPublicAppUrl(), `/app/staff?store=${encodedStore}&billing=cancel`),
  );
  setCheckoutCustomer(params, input);
  return params;
}

export function buildProCheckoutParams(
  input: ProCheckoutInput & { priceId: string; kind?: 'pro_plan' | 'pro_plus_plan' },
): URLSearchParams {
  const encodedStore = encodeURIComponent(input.storeSlug);
  const kind = input.kind ?? 'pro_plan';
  const params = new URLSearchParams();
  params.set('mode', 'subscription');
  params.set('currency', input.currency.toLowerCase());
  params.set('locale', toStripeCheckoutLocale(input.locale));
  params.set('line_items[0][price]', input.priceId);
  params.set('line_items[0][quantity]', '1');
  params.set('client_reference_id', input.storeId);
  const interval = input.interval ?? 'month';
  params.set('metadata[storeId]', input.storeId);
  params.set('metadata[kind]', kind);
  params.set('metadata[interval]', interval);
  params.set('metadata[priceId]', input.priceId);
  params.set('subscription_data[metadata][storeId]', input.storeId);
  params.set('subscription_data[metadata][kind]', kind);
  params.set('subscription_data[metadata][interval]', interval);
  params.set('subscription_data[metadata][priceId]', input.priceId);
  const successQuery =
    kind === 'pro_plus_plan'
      ? `/app/settings?store=${encodedStore}&billing=success&plan=pro-plus#pro-plus-onboarding`
      : `/app/settings?store=${encodedStore}&billing=success`;
  params.set('success_url', joinPublicUrl(getPublicAppUrl(), successQuery));
  params.set(
    'cancel_url',
    joinPublicUrl(getPublicAppUrl(), `/app/settings?store=${encodedStore}&billing=cancel`),
  );
  setCheckoutCustomer(params, input);
  return params;
}

export async function createProPlusCheckoutSession(
  config: StripeConfig,
  input: ProCheckoutInput,
): Promise<{ url: string }> {
  const interval = input.interval ?? 'month';
  const priceId = getProPlusCheckoutPriceId(config, interval);
  if (!priceId) throw new StripeRequestError(503);
  const params = buildProCheckoutParams({
    ...input,
    interval,
    priceId,
    kind: 'pro_plus_plan',
  });
  const data = await stripeRequest(config, '/checkout/sessions', params);
  if (!data.url) throw new StripeRequestError(502);
  return { url: data.url };
}

export async function createStaffSeatCheckoutSession(
  config: StripeConfig,
  input: StaffSeatCheckoutInput,
): Promise<{ url: string }> {
  if (!config.staffSeatPriceId) throw new StripeRequestError(503);
  const params = buildStaffSeatCheckoutParams({ ...input, priceId: config.staffSeatPriceId });

  const data = await stripeRequest(config, '/checkout/sessions', params);
  if (!data.url) {
    throw new StripeRequestError(502);
  }
  return { url: data.url };
}

export async function createProCheckoutSession(
  config: StripeConfig,
  input: ProCheckoutInput,
): Promise<{ url: string }> {
  const interval = input.interval ?? 'month';
  const priceId = getProCheckoutPriceId(config, interval);
  if (!priceId) throw new StripeRequestError(503);
  const params = buildProCheckoutParams({ ...input, interval, priceId });

  const data = await stripeRequest(config, '/checkout/sessions', params);
  if (!data.url) throw new StripeRequestError(502);
  return { url: data.url };
}

export async function updatePlanSubscriptionPrice(
  config: StripeConfig,
  input: {
    subscriptionId: string;
    itemId: string;
    priceId: string;
    kind: 'pro_plan' | 'pro_plus_plan';
  },
): Promise<void> {
  const params = new URLSearchParams();
  params.set('items[0][id]', input.itemId);
  params.set('items[0][price]', input.priceId);
  params.set('proration_behavior', 'create_prorations');
  params.set('metadata[kind]', input.kind);
  params.set('metadata[priceId]', input.priceId);
  await stripeRequest(config, `/subscriptions/${encodeURIComponent(input.subscriptionId)}`, params);
}

export async function createBillingPortalSession(
  config: StripeConfig,
  input: { stripeCustomerId: string; storeSlug: string },
): Promise<{ url: string }> {
  const encodedStore = encodeURIComponent(input.storeSlug);
  const params = new URLSearchParams();
  params.set('customer', input.stripeCustomerId);
  params.set('return_url', joinPublicUrl(getPublicAppUrl(), `/app/settings?store=${encodedStore}`));
  const data = await stripeRequest(config, '/billing_portal/sessions', params);
  if (!data.url) throw new StripeRequestError(502);
  return { url: data.url };
}

export function isSubscriptionUsable(status: string | null): boolean {
  return status === 'active' || status === 'trialing' || status === 'past_due';
}

export async function updateStaffSeatSubscriptionItem(
  config: StripeConfig,
  itemId: string,
  quantity: number,
): Promise<void> {
  const params = new URLSearchParams();
  params.set('quantity', String(quantity));
  params.set('proration_behavior', 'create_prorations');
  await stripeRequest(config, `/subscription_items/${encodeURIComponent(itemId)}`, params);
}

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function verifyStripeWebhookSignature(
  payload: string,
  signatureHeader: string,
  webhookSecret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<boolean> {
  const values = new Map<string, string[]>();
  for (const part of signatureHeader.split(',')) {
    const [key, value] = part.split('=', 2);
    if (!key || !value) continue;
    const current = values.get(key) ?? [];
    current.push(value);
    values.set(key, current);
  }

  const timestamp = Number(values.get('t')?.[0]);
  if (!Number.isFinite(timestamp) || Math.abs(nowSeconds - timestamp) > WEBHOOK_TOLERANCE_SECONDS) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expected = hex(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`)),
  );
  return (values.get('v1') ?? []).some((value) => constantTimeEqual(value, expected));
}
