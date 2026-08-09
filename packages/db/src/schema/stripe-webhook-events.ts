import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Stripe webhook 事件去重表。
 * event_id 作主键，插入成功即代表首次投递；冲突即重复投递。
 */
export const stripeWebhookEvents = sqliteTable('stripe_webhook_events', {
  eventId: text('event_id').primaryKey(),
  receivedAt: integer('received_at', { mode: 'timestamp_ms' }).notNull(),
});
