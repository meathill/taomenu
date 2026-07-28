import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { stores } from './stores';

export const PUSH_SUBJECT_TYPES = ['terminal', 'owner'] as const;
export type PushSubjectType = (typeof PUSH_SUBJECT_TYPES)[number];

export const pushSubscriptions = sqliteTable(
  'push_subscriptions',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    subjectType: text('subject_type').notNull().$type<PushSubjectType>(),
    /** 终端配对后填写；MVP 店主通道可为空 */
    terminalId: text('terminal_id'),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    p256dhKey: text('p256dh_key').notNull(),
    authKey: text('auth_key').notNull(),
    platform: text('platform'),
    userAgent: text('user_agent'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    lastSuccessAt: integer('last_success_at', { mode: 'timestamp_ms' }),
    verifiedAt: integer('verified_at', { mode: 'timestamp_ms' }),
    disabledAt: integer('disabled_at', { mode: 'timestamp_ms' }),
  },
  (table) => [uniqueIndex('push_subscriptions_endpoint_unique').on(table.endpoint)],
);

export const OUTBOX_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export const NOTIFICATION_EVENT_TYPES = [
  'order.submitted',
  'service_request.created',
  'push.test',
] as const;
export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export const notificationOutbox = sqliteTable('notification_outbox', {
  id: text('id').primaryKey(),
  storeId: text('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull().$type<NotificationEventType>(),
  entityId: text('entity_id').notNull(),
  payloadJson: text('payload_json'),
  notBefore: integer('not_before', { mode: 'timestamp_ms' }).notNull(),
  status: text('status').notNull().$type<OutboxStatus>().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  processedAt: integer('processed_at', { mode: 'timestamp_ms' }),
});

export const DELIVERY_STATUSES = ['pending', 'sent', 'failed', 'gone'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const notificationDeliveries = sqliteTable(
  'notification_deliveries',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => notificationOutbox.id, { onDelete: 'cascade' }),
    subscriptionId: text('subscription_id')
      .notNull()
      .references(() => pushSubscriptions.id, { onDelete: 'cascade' }),
    status: text('status').notNull().$type<DeliveryStatus>().default('pending'),
    responseCode: integer('response_code'),
    attempts: integer('attempts').notNull().default(0),
    lastAttemptAt: integer('last_attempt_at', { mode: 'timestamp_ms' }),
    deliveredAt: integer('delivered_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    uniqueIndex('notification_deliveries_event_sub').on(table.eventId, table.subscriptionId),
  ],
);
