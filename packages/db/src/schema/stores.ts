import type { PlanId } from '@taomenu/shared';
import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth';

export const SERVICE_MODES = ['table_service', 'counter_pickup', 'hybrid'] as const;
export type ServiceMode = (typeof SERVICE_MODES)[number];

export const STORE_ROLES = ['owner', 'staff'] as const;
export type StoreRole = (typeof STORE_ROLES)[number];

export const stores = sqliteTable(
  'stores',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    timezone: text('timezone').notNull().default('Asia/Ho_Chi_Minh'),
    currency: text('currency').notNull().default('VND'),
    baseLocale: text('base_locale').notNull().default('vi'),
    serviceMode: text('service_mode').notNull().$type<ServiceMode>(),
    acceptingPublicRequests: integer('accepting_public_requests', { mode: 'boolean' })
      .notNull()
      .default(true),
    plan: text('plan').notNull().$type<PlanId>().default('free'),
    planExpiresAt: integer('plan_expires_at', { mode: 'timestamp_ms' }),
    staffSeatAddons: integer('staff_seat_addons').notNull().default(0),
    stripeCustomerId: text('stripe_customer_id'),
    stripeStaffSeatSubscriptionId: text('stripe_staff_seat_subscription_id'),
    stripeStaffSeatItemId: text('stripe_staff_seat_item_id'),
    menuVersion: integer('menu_version').notNull().default(0),
    orderVersion: integer('order_version').notNull().default(0),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('stores_slug_unique').on(table.slug)],
);

export const storeMembers = sqliteTable(
  'store_members',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull().$type<StoreRole>().default('owner'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('store_members_store_user_unique').on(table.storeId, table.userId)],
);
