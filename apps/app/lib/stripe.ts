import { getEnv } from './cf';
import { getPublicAppUrl, joinPublicUrl } from './public-url';

const STRIPE_API_VERSION = '2026-04-22.dahlia';
const STRIPE_API_URL = 'https://api.stripe.com/v1';
const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

export type StripeConfig = {
  secretKey: string;
  webhookSecret: string;
  staffSeatPriceId?: string;
  proPriceId?: string;
};

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
};

export type StaffSeatCheckoutInput = CheckoutInputBase & { quantity: number };

export type ProCheckoutInput = CheckoutInputBase;

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
  input: ProCheckoutInput & { priceId: string },
): URLSearchParams {
  const encodedStore = encodeURIComponent(input.storeSlug);
  const params = new URLSearchParams();
  params.set('mode', 'subscription');
  params.set('currency', input.currency.toLowerCase());
  params.set('line_items[0][price]', input.priceId);
  params.set('line_items[0][quantity]', '1');
  params.set('client_reference_id', input.storeId);
  params.set('metadata[storeId]', input.storeId);
  params.set('metadata[kind]', 'pro_plan');
  params.set('subscription_data[metadata][storeId]', input.storeId);
  params.set('subscription_data[metadata][kind]', 'pro_plan');
  params.set(
    'success_url',
    joinPublicUrl(getPublicAppUrl(), `/app/settings?store=${encodedStore}&billing=success`),
  );
  params.set(
    'cancel_url',
    joinPublicUrl(getPublicAppUrl(), `/app/settings?store=${encodedStore}&billing=cancel`),
  );
  setCheckoutCustomer(params, input);
  return params;
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
  if (!config.proPriceId) throw new StripeRequestError(503);
  const params = buildProCheckoutParams({ ...input, priceId: config.proPriceId });

  const data = await stripeRequest(config, '/checkout/sessions', params);
  if (!data.url) throw new StripeRequestError(502);
  return { url: data.url };
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
