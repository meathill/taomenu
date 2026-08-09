import type { MenuImportStatus } from '@taomenu/shared';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth';
import { menuItems } from './menu';
import { stores } from './stores';

export const menuImageEnhancementJobs = sqliteTable(
  'menu_image_enhancement_jobs',
  {
    id: text('id').primaryKey(),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => menuItems.id, { onDelete: 'cascade' }),
    status: text('status').notNull().$type<MenuImportStatus>().default('queued'),
    sourceImageKey: text('source_image_key').notNull(),
    previewImageKey: text('preview_image_key'),
    errorCode: text('error_code'),
    usageJson: text('usage_json'),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  },
  (table) => [
    index('menu_image_enhancement_jobs_store_created_idx').on(table.storeId, table.createdAt),
    index('menu_image_enhancement_jobs_item_created_idx').on(
      table.storeId,
      table.itemId,
      table.createdAt,
    ),
  ],
);
