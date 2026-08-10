import { beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '../testing/memory-d1';
import type { Db } from '../types';
import { claimStripeWebhookEvent, releaseStripeWebhookEvent } from './stripe-webhook-events';

describe('stripe webhook 事件去重', () => {
  let db: Db;

  beforeEach(() => {
    db = createTestDb('0013_stripe_webhook_events.sql');
  });

  it('首次投递占位成功', async () => {
    expect(await claimStripeWebhookEvent(db, 'evt_1')).toBe(true);
  });

  it('重复投递同一事件返回 false', async () => {
    expect(await claimStripeWebhookEvent(db, 'evt_1')).toBe(true);
    expect(await claimStripeWebhookEvent(db, 'evt_1')).toBe(false);
  });

  it('不同事件互不影响', async () => {
    expect(await claimStripeWebhookEvent(db, 'evt_1')).toBe(true);
    expect(await claimStripeWebhookEvent(db, 'evt_2')).toBe(true);
  });

  it('释放后可以重新占位，保证 Stripe 重试仍会处理', async () => {
    expect(await claimStripeWebhookEvent(db, 'evt_1')).toBe(true);
    await releaseStripeWebhookEvent(db, 'evt_1');
    expect(await claimStripeWebhookEvent(db, 'evt_1')).toBe(true);
  });

  it('释放只影响指定事件', async () => {
    await claimStripeWebhookEvent(db, 'evt_1');
    await claimStripeWebhookEvent(db, 'evt_2');
    await releaseStripeWebhookEvent(db, 'evt_1');
    expect(await claimStripeWebhookEvent(db, 'evt_2')).toBe(false);
    expect(await claimStripeWebhookEvent(db, 'evt_1')).toBe(true);
  });
});
