import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { stores } from './stores';

export const terminalDevices = sqliteTable(
  'terminal_devices',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    credentialHash: text('credential_hash').notNull(),
    pairedByUserId: text('paired_by_user_id').notNull(),
    staffUserId: text('staff_user_id').references(() => user.id, { onDelete: 'set null' }),
    pairedAt: integer('paired_at', { mode: 'timestamp_ms' }).notNull(),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp_ms' }),
    revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [index('terminal_devices_store_active_idx').on(table.storeId, table.revokedAt)],
);

export const terminalPairingCodes = sqliteTable(
  'terminal_pairing_codes',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    createdByUserId: text('created_by_user_id').notNull(),
    codeHintHash: text('code_hint_hash').notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    usedAt: integer('used_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => [
    index('terminal_pairing_codes_active_idx').on(table.storeId, table.usedAt, table.expiresAt),
  ],
);
