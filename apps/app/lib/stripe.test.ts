import { describe, expect, it } from 'vitest';
import { isSubscriptionUsable, verifyStripeWebhookSignature } from './stripe';

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

describe('Stripe subscription entitlement', () => {
  it.each(['active', 'trialing', 'past_due'])('%s 暂时保留已购买权益', (status) => {
    expect(isSubscriptionUsable(status)).toBe(true);
  });

  it.each(['incomplete', 'unpaid', 'canceled', null])('%s 不授予 Pro 权益', (status) => {
    expect(isSubscriptionUsable(status)).toBe(false);
  });
});
