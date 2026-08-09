import type {
  MenuImportDecision,
  MenuImportStatus,
  MenuTranslationEntityType,
} from '@taomenu/shared';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { stores } from './stores';

export const menuTranslationJobs = sqliteTable(
  'menu_translation_jobs',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    status: text('status').notNull().$type<MenuImportStatus>().default('queued'),
    sourceLocale: text('source_locale').notNull(),
    targetLocale: text('target_locale').notNull(),
    inputJson: text('input_json').notNull(),
    progress: integer('progress').notNull().default(0),
    errorCode: text('error_code'),
    usageJson: text('usage_json'),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  },
  (table) => [index('menu_translation_jobs_store_created_idx').on(table.storeId, table.createdAt)],
);

export const menuTranslationSuggestions = sqliteTable(
  'menu_translation_suggestions',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    jobId: text('job_id')
      .notNull()
      .references(() => menuTranslationJobs.id, { onDelete: 'cascade' }),
    entityType: text('entity_type').notNull().$type<MenuTranslationEntityType>(),
    entityId: text('entity_id').notNull(),
    sourceName: text('source_name').notNull(),
    sourceDescription: text('source_description'),
    suggestedName: text('suggested_name').notNull(),
    suggestedDescription: text('suggested_description'),
    decision: text('decision').notNull().$type<MenuImportDecision>().default('pending'),
    decidedByUserId: text('decided_by_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    decidedAt: integer('decided_at', { mode: 'timestamp_ms' }),
  },
  (table) => [index('menu_translation_suggestions_job_idx').on(table.storeId, table.jobId)],
);
