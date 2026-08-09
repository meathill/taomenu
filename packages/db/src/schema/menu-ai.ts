import type { MenuImportDecision, MenuImportStatus } from '@taomenu/shared';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { stores } from './stores';

export const menuImports = sqliteTable(
  'menu_imports',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    status: text('status').notNull().$type<MenuImportStatus>().default('draft'),
    sourceLocale: text('source_locale'),
    targetLocalesJson: text('target_locales_json').notNull().default('[]'),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    promptVersion: text('prompt_version').notNull(),
    schemaVersion: text('schema_version').notNull(),
    progress: integer('progress').notNull().default(0),
    errorCode: text('error_code'),
    usageJson: text('usage_json'),
    estimatedCostUsdTicks: integer('estimated_cost_usd_ticks'),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  },
  (table) => [index('menu_imports_store_created_idx').on(table.storeId, table.createdAt)],
);

export const menuImportAssets = sqliteTable(
  'menu_import_assets',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    importId: text('import_id')
      .notNull()
      .references(() => menuImports.id, { onDelete: 'cascade' }),
    r2Key: text('r2_key').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    pageOrder: integer('page_order').notNull().default(0),
  },
  (table) => [index('menu_import_assets_import_idx').on(table.storeId, table.importId)],
);

export const menuImportSuggestions = sqliteTable(
  'menu_import_suggestions',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    importId: text('import_id')
      .notNull()
      .references(() => menuImports.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').notNull().$type<'category' | 'item'>(),
    temporaryEntityKey: text('temporary_entity_key').notNull(),
    fieldName: text('field_name').notNull().default('entity'),
    locale: text('locale').notNull(),
    suggestedValueJson: text('suggested_value_json').notNull(),
    confidence: real('confidence').notNull(),
    decision: text('decision').notNull().$type<MenuImportDecision>().default('pending'),
    decidedByUserId: text('decided_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    decidedAt: integer('decided_at', { mode: 'timestamp_ms' }),
  },
  (table) => [index('menu_import_suggestions_import_idx').on(table.storeId, table.importId)],
);
