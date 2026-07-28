import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { menuItems } from './menu';
import { stores } from './stores';

export const diningTables = sqliteTable('dining_tables', {
  id: text('id').primaryKey(),
  storeId: text('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  tokenHash: text('token_hash').notNull(),
  tokenVersion: integer('token_version').notNull().default(1),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const pickupPoints = sqliteTable('pickup_points', {
  id: text('id').primaryKey(),
  storeId: text('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  tokenHash: text('token_hash').notNull(),
  tokenVersion: integer('token_version').notNull().default(1),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const TABLE_SESSION_STATUSES = ['open', 'closed', 'force_closed'] as const;
export type TableSessionStatus = (typeof TABLE_SESSION_STATUSES)[number];

export const tableSessions = sqliteTable('table_sessions', {
  id: text('id').primaryKey(),
  storeId: text('store_id')
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' }),
  tableId: text('table_id')
    .notNull()
    .references(() => diningTables.id, { onDelete: 'cascade' }),
  status: text('status').notNull().$type<TableSessionStatus>().default('open'),
  openedAt: integer('opened_at', { mode: 'timestamp_ms' }).notNull(),
  closedAt: integer('closed_at', { mode: 'timestamp_ms' }),
  closedByTerminalId: text('closed_by_terminal_id'),
});

export const FULFILLMENT_MODES = ['dine_in', 'pickup'] as const;
export type FulfillmentMode = (typeof FULFILLMENT_MODES)[number];

export const ORDER_STATUSES = [
  'submitted',
  'accepted',
  'served',
  'ready_for_pickup',
  'picked_up',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orders = sqliteTable(
  'orders',
  {
    id: text('id').primaryKey(),
    publicTokenHash: text('public_token_hash').notNull(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    fulfillmentMode: text('fulfillment_mode').notNull().$type<FulfillmentMode>(),
    tableId: text('table_id'),
    tableSessionId: text('table_session_id'),
    pickupPointId: text('pickup_point_id'),
    displayNumber: integer('display_number').notNull(),
    pickupNumber: integer('pickup_number'),
    businessDate: text('business_date'),
    status: text('status').notNull().$type<OrderStatus>().default('submitted'),
    locale: text('locale').notNull().default('vi'),
    subtotalAmount: integer('subtotal_amount').notNull(),
    note: text('note'),
    createdByActorType: text('created_by_actor_type').notNull().default('customer'),
    createdByTerminalId: text('created_by_terminal_id'),
    idempotencyKey: text('idempotency_key').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    uniqueIndex('orders_store_idempotency').on(table.storeId, table.idempotencyKey),
    uniqueIndex('orders_store_business_pickup').on(
      table.storeId,
      table.businessDate,
      table.pickupNumber,
    ),
  ],
);

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  menuItemId: text('menu_item_id')
    .notNull()
    .references(() => menuItems.id),
  quantity: integer('quantity').notNull(),
  nameSnapshot: text('name_snapshot').notNull(),
  unitPriceAmount: integer('unit_price_amount').notNull(),
  lineTotalAmount: integer('line_total_amount').notNull(),
});

export const pickupNumberSequences = sqliteTable(
  'pickup_number_sequences',
  {
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    businessDate: text('business_date').notNull(),
    nextValue: integer('next_value').notNull().default(1),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [uniqueIndex('pickup_seq_store_date').on(table.storeId, table.businessDate)],
);
