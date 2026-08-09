import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDb } from '../index';
import type { Db } from '../types';
import { claimStripeWebhookEvent, releaseStripeWebhookEvent } from './stripe-webhook-events';

type SqlParam = null | number | bigint | string | Uint8Array;

/**
 * 把 node:sqlite 包成 drizzle d1 driver 需要的最小接口，
 * 这样测试跑的是真实 SQL（含 ON CONFLICT / RETURNING）与真实建表语句。
 */
function createMemoryD1(setupSql: string) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(setupSql);

  return {
    prepare(sql: string) {
      const statement = sqlite.prepare(sql);
      return {
        bind(...params: SqlParam[]) {
          return {
            async all() {
              return { success: true, results: statement.all(...params), meta: {} };
            },
            async raw() {
              return statement.all(...params).map((row) => Object.values(row));
            },
            async run() {
              const result = statement.run(...params);
              return { success: true, meta: { changes: Number(result.changes) } };
            },
          };
        },
      };
    },
  };
}

const MIGRATION_SQL = readFileSync(
  new URL('../../migrations/0013_stripe_webhook_events.sql', import.meta.url),
  'utf8',
);

describe('stripe webhook 事件去重', () => {
  let db: Db;

  beforeEach(() => {
    db = createDb(createMemoryD1(MIGRATION_SQL) as unknown as Parameters<typeof createDb>[0]);
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
